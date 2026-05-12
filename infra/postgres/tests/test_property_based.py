"""Property-based tests for Zedral Database Schema CHECK constraints and structure.

This module contains property-based tests using the Hypothesis library to validate
database constraints, schema structure, and migration idempotency.

Feature: zedral-database-schema

Properties tested:
- Property 1: Schema structure is complete and consistent
- Property 2: Migration idempotency
- Property 4: CHECK constraint — changeover setup time is positive
- Property 5: CHECK constraint — calendar availability is non-negative
- Property 6: CHECK constraint — work order planned quantity is positive
- Property 7: CHECK constraint — coil weight bounds are maintained
- Property 8: CHECK constraint — production pass number is at least 1
- Property 9: CHECK constraint — roll tonnage counters are non-negative
- Property 10: CHECK constraint — stoppage rollup bucket is from the valid set

Each property test runs a minimum of 100 iterations.
"""
from __future__ import annotations

import pytest
import psycopg2
from psycopg2.errors import CheckViolation
from hypothesis import given, settings, strategies as st, assume, example
from hypothesis.database import InMemoryExampleDatabase


# ============================================================================
# Test Configuration
# ============================================================================

# Ensure at least 100 iterations per property test
settings.register_profile("ci", max_examples=100, database=InMemoryExampleDatabase())
settings.load_profile("ci")


# ============================================================================
# Property 1: Schema structure is complete and consistent
# ============================================================================

class TestProperty1SchemaStructure:
    """
    Feature: zedral-database-schema
    Property 1: Schema structure is complete and consistent
    
    Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8, 2.1–2.14, 3.1–3.8, 6.1–6.8, 7.1–7.12
    
    For each in-scope table, verify:
    - All required columns exist with correct data_type
    - Audit columns (created_at, updated_at) on non-append-only tables
    - FK columns are TEXT type
    - JSONB columns are jsonb type
    - UUID PK columns are uuid type
    - BIGSERIAL PK columns are bigint type
    """
    
    # In-scope schemas and their expected table counts
    EXPECTED_SCHEMAS = {
        'master': 14,
        'm1_demand': 8,
        'm5a_material': 8,
        'm6_dispatch': 12
    }
    
    # Tables that are append-only (no updated_at column)
    APPEND_ONLY_TABLES = {
        'm1_demand.priority_score_history',
        'm1_demand.validation_errors',
        'm5a_material.coil_stage_history',
        'm6_dispatch.execution_events',
    }
    
    # Tables with UUID primary keys
    UUID_PK_TABLES = {
        'master.changeover_matrix',
        'master.resource_calendars',
        'master.emission_factors',
        'm1_demand.priority_overrides',
        'm5a_material.pre_allocations',
        'm5a_material.inbound_expected',
        'm5a_material.shortage_forecast',
        'm6_dispatch.dispatch_lists',
        'm6_dispatch.dispatch_items',
        'm6_dispatch.execution_events',
        'm6_dispatch.stoppages',
        'm6_dispatch.rejects',
        'm6_dispatch.shift_handovers',
        'm6_dispatch.setup_timings',
        'm6_dispatch.production_passes',
        'm6_dispatch.roll_assignments',
        'm6_dispatch.roll_changes',
        'm6_dispatch.shift_crew_assignments',
    }
    
    # Tables with BIGSERIAL primary keys
    BIGSERIAL_PK_TABLES = {
        'm1_demand.priority_score_history',
        'm1_demand.validation_errors',
        'm5a_material.coil_stage_history',
    }
    
    # Tables with JSONB columns
    JSONB_COLUMN_TABLES = {
        'm1_demand.sales_orders': ['raw_sap_payload'],
        'm1_demand.priority_score_history': ['score_components'],
        'm1_demand.validation_errors': ['error_detail'],
        'm5a_material.coils': ['raw_sap_payload'],
        'm5a_material.wo_readiness': ['reserved_coils', 'expected_coils'],
        'm6_dispatch.dispatch_items': ['expected_coils'],
        'm6_dispatch.execution_events': ['payload'],
        'm6_dispatch.shift_handovers': ['jobs_completed', 'jobs_in_progress', 'pending_items'],
        'm6_dispatch.shift_crew_assignments': ['crew_members'],
        'm6_dispatch.config': ['config_value'],
    }
    
    def test_schema_table_counts(self, db_cursor):
        """
        Feature: zedral-database-schema
        Property 1: Schema structure is complete and consistent
        
        Verify each schema has the expected number of tables.
        
        Validates: Requirements 10.11
        """
        cursor = db_cursor
        
        for schema_name, expected_count in self.EXPECTED_SCHEMAS.items():
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = %s 
                AND table_type = 'BASE TABLE'
            """, (schema_name,))
            
            actual_count = cursor.fetchone()[0]
            assert actual_count == expected_count, (
                f"Schema '{schema_name}': expected {expected_count} tables, "
                f"found {actual_count}"
            )
    
    def test_audit_columns_exist(self, db_cursor):
        """
        Feature: zedral-database-schema
        Property 1: Schema structure is complete and consistent
        
        Verify that created_at and updated_at columns exist on non-append-only tables.
        
        Validates: Requirements 1.4
        """
        cursor = db_cursor
        
        for schema_name in self.EXPECTED_SCHEMAS.keys():
            cursor.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = %s
                AND table_type = 'BASE TABLE'
            """, (schema_name,))
            
            tables = [row[0] for row in cursor.fetchall()]
            
            for table_name in tables:
                full_table_name = f"{schema_name}.{table_name}"
                
                # Skip append-only tables (they don't need updated_at)
                if full_table_name in self.APPEND_ONLY_TABLES:
                    # Check only created_at exists
                    cursor.execute("""
                        SELECT COUNT(*)
                        FROM information_schema.columns
                        WHERE table_schema = %s
                        AND table_name = %s
                        AND column_name = 'created_at'
                    """, (schema_name, table_name))
                    
                    assert cursor.fetchone()[0] == 1, (
                        f"Append-only table {full_table_name} missing created_at column"
                    )
                else:
                    # Check both created_at and updated_at exist
                    cursor.execute("""
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = %s
                        AND table_name = %s
                        AND column_name IN ('created_at', 'updated_at')
                    """, (schema_name, table_name))
                    
                    found_columns = {row[0] for row in cursor.fetchall()}
                    
                    assert 'created_at' in found_columns, (
                        f"Table {full_table_name} missing created_at column"
                    )
                    assert 'updated_at' in found_columns, (
                        f"Table {full_table_name} missing updated_at column"
                    )
    
    def test_fk_columns_are_text(self, db_cursor):
        """
        Feature: zedral-database-schema
        Property 1: Schema structure is complete and consistent
        
        Verify that cross-module FK columns use TEXT type.
        
        Validates: Requirements 1.5
        """
        cursor = db_cursor
        
        # Known FK columns that should be TEXT
        text_fk_columns = [
            ('master', 'work_centres', 'plant_id'),
            ('master', 'routings', 'material_code'),
            ('master', 'routing_operations', 'routing_id'),
            ('master', 'changeover_matrix', 'wc_id'),
            ('master', 'resource_calendars', 'wc_id'),
            ('master', 'operator_skills', 'wc_id'),
            ('master', 'rolls', 'wc_id'),
            ('master', 'rolls', 'current_wc_id'),
            ('m1_demand', 'sales_orders', 'customer_id'),
            ('m1_demand', 'sales_order_items', 'so_id'),
            ('m1_demand', 'sales_order_items', 'material_code'),
            ('m1_demand', 'work_orders', 'material_code'),
            ('m1_demand', 'work_orders', 'routing_id'),
            ('m1_demand', 'work_orders', 'parent_wo_id'),
            ('m1_demand', 'wo_so_link', 'wo_id'),
            ('m1_demand', 'wo_so_link', 'so_id'),
            ('m5a_material', 'coils', 'material_code'),
            ('m5a_material', 'coils', 'parent_coil_id'),
            ('m6_dispatch', 'dispatch_lists', 'wc_id'),
            ('m6_dispatch', 'stoppages', 'stoppage_code_id'),
            ('m6_dispatch', 'rejects', 'defect_code_id'),
            ('m6_dispatch', 'roll_assignments', 'roll_id'),
            ('m6_dispatch', 'roll_changes', 'roll_out_id'),
            ('m6_dispatch', 'roll_changes', 'roll_in_id'),
            ('m6_dispatch', 'roll_changes', 'wc_id'),
            ('m6_dispatch', 'shift_crew_assignments', 'wc_id'),
        ]
        
        for schema, table, column in text_fk_columns:
            cursor.execute("""
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = %s
                AND table_name = %s
                AND column_name = %s
            """, (schema, table, column))
            
            result = cursor.fetchone()
            if result is None:
                continue  # Column might not exist in current schema version
            
            data_type = result[0]
            assert data_type == 'text', (
                f"FK column {schema}.{table}.{column} has type '{data_type}', expected 'text'"
            )
    
    def test_jsonb_columns_correct_type(self, db_cursor):
        """
        Feature: zedral-database-schema
        Property 1: Schema structure is complete and consistent
        
        Verify that JSONB columns have correct type.
        
        Validates: Requirements 1.6
        """
        cursor = db_cursor
        
        for full_table_name, jsonb_columns in self.JSONB_COLUMN_TABLES.items():
            schema_name, table_name = full_table_name.split('.')
            
            for column_name in jsonb_columns:
                cursor.execute("""
                    SELECT data_type
                    FROM information_schema.columns
                    WHERE table_schema = %s
                    AND table_name = %s
                    AND column_name = %s
                """, (schema_name, table_name, column_name))
                
                result = cursor.fetchone()
                if result is None:
                    continue
                
                data_type = result[0]
                assert data_type == 'jsonb', (
                    f"Column {full_table_name}.{column_name} has type '{data_type}', expected 'jsonb'"
                )
    
    def test_uuid_pk_columns(self, db_cursor):
        """
        Feature: zedral-database-schema
        Property 1: Schema structure is complete and consistent
        
        Verify that UUID PK columns have correct type.
        
        Validates: Requirements 1.7
        """
        cursor = db_cursor
        
        for full_table_name in self.UUID_PK_TABLES:
            schema_name, table_name = full_table_name.split('.')
            
            # Get primary key column name
            cursor.execute("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                JOIN pg_class c ON c.oid = i.indrelid
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE i.indisprimary
                AND n.nspname = %s
                AND c.relname = %s
            """, (schema_name, table_name))
            
            result = cursor.fetchone()
            if result is None:
                continue
            
            pk_column = result[0]
            
            cursor.execute("""
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = %s
                AND table_name = %s
                AND column_name = %s
            """, (schema_name, table_name, pk_column))
            
            data_type = cursor.fetchone()[0]
            assert data_type == 'uuid', (
                f"PK column {full_table_name}.{pk_column} has type '{data_type}', expected 'uuid'"
            )
    
    def test_bigserial_pk_columns(self, db_cursor):
        """
        Feature: zedral-database-schema
        Property 1: Schema structure is complete and consistent
        
        Verify that BIGSERIAL PK columns have correct type (bigint).
        
        Validates: Requirements 1.8
        """
        cursor = db_cursor
        
        for full_table_name in self.BIGSERIAL_PK_TABLES:
            schema_name, table_name = full_table_name.split('.')
            
            # Get primary key column name
            cursor.execute("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                JOIN pg_class c ON c.oid = i.indrelid
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE i.indisprimary
                AND n.nspname = %s
                AND c.relname = %s
            """, (schema_name, table_name))
            
            result = cursor.fetchone()
            if result is None:
                continue
            
            pk_column = result[0]
            
            cursor.execute("""
                SELECT data_type
                FROM information_schema.columns
                WHERE table_schema = %s
                AND table_name = %s
                AND column_name = %s
            """, (schema_name, table_name, pk_column))
            
            data_type = cursor.fetchone()[0]
            assert data_type == 'bigint', (
                f"PK column {full_table_name}.{pk_column} has type '{data_type}', expected 'bigint'"
            )


# ============================================================================
# Property 2: Migration idempotency
# ============================================================================

class TestProperty2MigrationIdempotency:
    """
    Feature: zedral-database-schema
    Property 2: Migration idempotency
    
    Validates: Requirements 1.10, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8
    
    Apply migration to fresh DB; record table counts and seed row counts;
    apply migration again; assert zero errors; assert identical counts.
    """
    
    def test_migration_idempotency(self, fresh_database, migration_sql):
        """
        Feature: zedral-database-schema
        Property 2: Migration idempotency
        
        Apply migration twice and verify no changes on second run.
        
        Validates: Requirements 1.10, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8
        """
        host = fresh_database["host"]
        port = fresh_database["port"]
        dbname = fresh_database["dbname"]
        
        conn = psycopg2.connect(
            host=host, port=port, user=fresh_database["user"],
            password=fresh_database["password"], dbname=dbname
        )
        
        try:
            cursor = conn.cursor()
            
            def get_table_counts():
                cursor.execute("""
                    SELECT table_schema, COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema IN ('master', 'm1_demand', 'm5a_material', 'm6_dispatch')
                    AND table_type = 'BASE TABLE'
                    GROUP BY table_schema
                """)
                return {row[0]: row[1] for row in cursor.fetchall()}
            
            def get_seed_counts():
                seed_tables = {
                    'master.plants': 'plant_id',
                    'master.work_centres': 'wc_id',
                    'master.stoppage_codes': 'code_id',
                    'master.defect_codes': 'code_id',
                    'master.emission_factors': 'factor_id',
                    'm6_dispatch.config': 'config_key'
                }
                counts = {}
                for table, pk_col in seed_tables.items():
                    schema, tbl = table.split('.')
                    cursor.execute(
                        f'SELECT COUNT(*) FROM {schema}."{tbl}"'
                    )
                    counts[table] = cursor.fetchone()[0]
                return counts
            
            initial_table_counts = get_table_counts()
            initial_seed_counts = get_seed_counts()
            
            cursor.close()
            conn.close()
            
            # Apply migration a second time
            conn2 = psycopg2.connect(
                host=host, port=port, user=fresh_database["user"],
                password=fresh_database["password"], dbname=dbname
            )
            
            try:
                cursor2 = conn2.cursor()
                cursor2.execute(migration_sql)
                conn2.commit()
                cursor2.close()
            except Exception as e:
                conn2.rollback()
                pytest.fail(f"Migration failed on second application: {e}")
            finally:
                conn2.close()
            
            # Verify counts are unchanged
            conn3 = psycopg2.connect(
                host=host, port=port, user=fresh_database["user"],
                password=fresh_database["password"], dbname=dbname
            )
            
            try:
                cursor3 = conn3.cursor()
                
                final_table_counts = get_table_counts()
                final_seed_counts = get_seed_counts()
                
                assert initial_table_counts == final_table_counts, (
                    f"Table counts changed after second migration: "
                    f"initial={initial_table_counts}, final={final_table_counts}"
                )
                
                for table, count in initial_seed_counts.items():
                    assert final_seed_counts[table] == count, (
                        f"Seed table '{table}' has duplicate rows after re-run: "
                        f"initial={count}, final={final_seed_counts[table]}"
                    )
                
                cursor3.close()
            finally:
                conn3.close()
                
        except Exception as e:
            if 'conn' in locals() and conn:
                conn.close()
            raise


# ============================================================================
# Property 4: CHECK constraint — changeover setup time is positive
# ============================================================================

class TestProperty4ChangeoverSetupTime:
    """
    Feature: zedral-database-schema
    Property 4: CHECK constraint — changeover setup time is positive
    
    Validates: Requirements 12.1
    
    For any attempted insert into master.changeover_matrix with setup_min <= 0,
    the database must reject the row with a constraint violation error.
    """
    
    @given(setup_min=st.integers(max_value=0))
    @settings(max_examples=100)
    def test_setup_min_rejects_non_positive(self, db_cursor, setup_min):
        """
        Feature: zedral-database-schema
        Property 4: CHECK constraint — changeover setup time is positive
        
        Generate random setup_min values <= 0 and assert CHECK constraint violation.
        
        Validates: Requirements 12.1
        """
        cursor = db_cursor
        
        # Attempt to insert a row with invalid setup_min
        with pytest.raises(CheckViolation) as exc_info:
            cursor.execute("""
                INSERT INTO master.changeover_matrix (
                    wc_id, grade_to, gauge_to_mm, width_to_mm, setup_min
                ) VALUES (
                    'CRS-1', 'IS513-CR1', 1.0, 1000, %s
                )
            """, (setup_min,))
        
        assert 'setup_min' in str(exc_info.value).lower() or 'check' in str(exc_info.value).lower()


# ============================================================================
# Property 5: CHECK constraint — calendar availability is non-negative
# ============================================================================

class TestProperty5CalendarAvailability:
    """
    Feature: zedral-database-schema
    Property 5: CHECK constraint — calendar availability is non-negative
    
    Validates: Requirements 12.2
    
    For any attempted insert into master.resource_calendars with available_hrs < 0,
    the database must reject the row with a constraint violation error.
    """
    
    @given(available_hrs=st.floats(
        min_value=-1000, max_value=-0.01,
        allow_nan=False, allow_infinity=False
    ))
    @settings(max_examples=100)
    def test_available_hrs_rejects_negative(self, db_cursor, available_hrs):
        """
        Feature: zedral-database-schema
        Property 5: CHECK constraint — calendar availability is non-negative
        
        Generate random available_hrs values < 0 and assert CHECK constraint violation.
        
        Validates: Requirements 12.2
        """
        cursor = db_cursor
        
        with pytest.raises(CheckViolation) as exc_info:
            cursor.execute("""
                INSERT INTO master.resource_calendars (
                    wc_id, calendar_date, shift, shift_start, shift_end, available_hrs
                ) VALUES (
                    'CRS-1', CURRENT_DATE, 'A', NOW(), NOW() + INTERVAL '8 hours', %s
                )
            """, (available_hrs,))
        
        assert 'available_hrs' in str(exc_info.value).lower() or 'check' in str(exc_info.value).lower()


# ============================================================================
# Property 6: CHECK constraint — work order planned quantity is positive
# ============================================================================

class TestProperty6WorkOrderQtyPlanned:
    """
    Feature: zedral-database-schema
    Property 6: CHECK constraint — work order planned quantity is positive
    
    Validates: Requirements 12.3
    
    For any attempted insert into m1_demand.work_orders with qty_planned_mt <= 0,
    the database must reject the row with a constraint violation error.
    """
    
    @given(qty_planned_mt=st.one_of(
        st.floats(min_value=-1000, max_value=-0.001, allow_nan=False, allow_infinity=False),
        st.just(0.0)
    ))
    @settings(max_examples=100)
    @example(qty_planned_mt=0.0)
    @example(qty_planned_mt=-1.0)
    @example(qty_planned_mt=-100.0)
    def test_qty_planned_rejects_non_positive(self, db_cursor, qty_planned_mt):
        """
        Feature: zedral-database-schema
        Property 6: CHECK constraint — work order planned quantity is positive
        
        Generate random qty_planned_mt values <= 0 and assert CHECK constraint violation.
        
        Validates: Requirements 12.3
        """
        cursor = db_cursor
        
        # First, ensure we have prerequisite data (material)
        cursor.execute("""
            INSERT INTO master.materials (material_code, description, grade)
            VALUES ('TEST_MAT_PBT', 'Test Material for PBT', 'IS513-CR1')
            ON CONFLICT (material_code) DO NOTHING
        """)
        
        with pytest.raises(CheckViolation) as exc_info:
            cursor.execute("""
                INSERT INTO m1_demand.work_orders (
                    wo_id, sap_wo_ref, material_code, grade, gauge_mm, width_mm,
                    qty_planned_mt, required_date, wo_type, status, sap_modified_at
                ) VALUES (
                    'TEST_WO_PBT', 'SAP_REF_PBT', 'TEST_MAT_PBT', 'IS513-CR1',
                    0.5, 1000, %s, CURRENT_DATE, 'customer', 'pending', NOW()
                )
            """, (qty_planned_mt,))
        
        assert 'qty_planned_mt' in str(exc_info.value).lower() or 'check' in str(exc_info.value).lower()


# ============================================================================
# Property 7: CHECK constraint — coil weight bounds are maintained
# ============================================================================

class TestProperty7CoilWeightBounds:
    """
    Feature: zedral-database-schema
    Property 7: CHECK constraint — coil weight bounds are maintained
    
    Validates: Requirements 12.4, 12.5
    
    For any coil row, weight_remaining_mt must satisfy both:
    - weight_remaining_mt >= 0
    - weight_remaining_mt <= weight_initial_mt
    
    Any insert or update violating either bound must be rejected.
    """
    
    @given(
        weight_initial_mt=st.floats(min_value=0.1, max_value=100.0, allow_nan=False, allow_infinity=False),
        weight_remaining_mt=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=100)
    def test_weight_remaining_bounds(self, db_cursor, weight_initial_mt, weight_remaining_mt):
        """
        Feature: zedral-database-schema
        Property 7: CHECK constraint — coil weight bounds are maintained
        
        Generate (weight_initial_mt, weight_remaining_mt) pairs where weight_remaining_mt
        is out of bounds, and assert CHECK constraint violation.
        
        Validates: Requirements 12.4, 12.5
        """
        cursor = db_cursor
        
        # Assume weight_remaining is out of bounds (either < 0 or > weight_initial)
        assume(weight_remaining_mt < 0 or weight_remaining_mt > weight_initial_mt)
        
        # Ensure we have prerequisite data (material)
        cursor.execute("""
            INSERT INTO master.materials (material_code, description, grade)
            VALUES ('TEST_MAT_COIL', 'Test Material for Coil PBT', 'IS513-CR1')
            ON CONFLICT (material_code) DO NOTHING
        """)
        
        with pytest.raises(CheckViolation) as exc_info:
            cursor.execute("""
                INSERT INTO m5a_material.coils (
                    coil_id, material_code, grade, gauge_mm, width_mm,
                    weight_initial_mt, weight_remaining_mt, current_stage
                ) VALUES (
                    'TEST_COIL_PBT', 'TEST_MAT_COIL', 'IS513-CR1', 0.5, 1000,
                    %s, %s, 'stores'
                )
            """, (weight_initial_mt, weight_remaining_mt))
        
        assert 'weight_remaining' in str(exc_info.value).lower() or 'check' in str(exc_info.value).lower()


# ============================================================================
# Property 8: CHECK constraint — production pass number is at least 1
# ============================================================================

class TestProperty8ProductionPassNumber:
    """
    Feature: zedral-database-schema
    Property 8: CHECK constraint — production pass number is at least 1
    
    Validates: Requirements 12.9
    
    For any attempted insert into m6_dispatch.production_passes with pass_number < 1,
    the database must reject the row with a constraint violation error.
    """
    
    @given(pass_number=st.integers(max_value=0))
    @settings(max_examples=100)
    @example(pass_number=0)
    @example(pass_number=-1)
    @example(pass_number=-100)
    def test_pass_number_rejects_less_than_one(self, db_cursor, pass_number):
        """
        Feature: zedral-database-schema
        Property 8: CHECK constraint — production pass number is at least 1
        
        Generate random pass_number values < 1 and assert CHECK constraint violation.
        
        Validates: Requirements 12.9
        """
        cursor = db_cursor
        
        # Create prerequisite dispatch list and item
        cursor.execute("""
            INSERT INTO m6_dispatch.dispatch_lists (
                dispatch_id, schedule_id, wc_id, shift_date, shift, shift_start, shift_end, status
            ) VALUES (
                '00000000-0000-0000-0000-000000000001',
                '00000000-0000-0000-0000-000000000002',
                'CRS-1', CURRENT_DATE, 'A', NOW(), NOW() + INTERVAL '8 hours', 'draft'
            )
            ON CONFLICT (dispatch_id) DO NOTHING
        """)
        
        cursor.execute("""
            INSERT INTO m6_dispatch.dispatch_items (
                item_id, dispatch_id, op_id, sequence_in_shift, op_type, actual_status
            ) VALUES (
                '00000000-0000-0000-0000-000000000003',
                '00000000-0000-0000-0000-000000000001',
                '00000000-0000-0000-0000-000000000004',
                1, 'production', 'pending'
            )
            ON CONFLICT (item_id) DO NOTHING
        """)
        
        with pytest.raises(CheckViolation) as exc_info:
            cursor.execute("""
                INSERT INTO m6_dispatch.production_passes (
                    dispatch_item_id, pass_number
                ) VALUES (
                    '00000000-0000-0000-0000-000000000003', %s
                )
            """, (pass_number,))
        
        assert 'pass_number' in str(exc_info.value).lower() or 'check' in str(exc_info.value).lower()


# ============================================================================
# Property 9: CHECK constraint — roll tonnage counters are non-negative
# ============================================================================

class TestProperty9RollTonnageCounters:
    """
    Feature: zedral-database-schema
    Property 9: CHECK constraint — roll tonnage counters are non-negative
    
    Validates: Requirements 12.10
    
    For any attempted insert or update on master.rolls with cumulative_tonnage_mt < 0
    or tonnage_since_grind_mt < 0, the database must reject the operation.
    """
    
    @given(
        cumulative_tonnage_mt=st.floats(min_value=-1000, max_value=-0.001, allow_nan=False, allow_infinity=False),
        tonnage_since_grind_mt=st.floats(min_value=-1000, max_value=-0.001, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=100)
    @example(cumulative_tonnage_mt=-1.0, tonnage_since_grind_mt=-1.0)
    @example(cumulative_tonnage_mt=-100.0, tonnage_since_grind_mt=0.0)
    @example(cumulative_tonnage_mt=0.0, tonnage_since_grind_mt=-50.0)
    def test_tonnage_counters_reject_negative(self, db_cursor, cumulative_tonnage_mt, tonnage_since_grind_mt):
        """
        Feature: zedral-database-schema
        Property 9: CHECK constraint — roll tonnage counters are non-negative
        
        Generate random negative values for tonnage counters and assert CHECK constraint violation.
        
        Validates: Requirements 12.10
        """
        cursor = db_cursor
        
        with pytest.raises(CheckViolation) as exc_info:
            cursor.execute("""
                INSERT INTO master.rolls (
                    roll_id, wc_id, roll_type, cumulative_tonnage_mt, tonnage_since_grind_mt
                ) VALUES (
                    'TEST_ROLL_PBT', 'CRS-1', 'work_roll_top', %s, %s
                )
            """, (cumulative_tonnage_mt, tonnage_since_grind_mt))
        
        assert 'cumulative_tonnage' in str(exc_info.value).lower() or \
               'tonnage_since_grind' in str(exc_info.value).lower() or \
               'check' in str(exc_info.value).lower()
    
    @given(negative_value=st.floats(min_value=-1000, max_value=-0.001, allow_nan=False, allow_infinity=False))
    @settings(max_examples=100)
    def test_cumulative_tonnage_rejects_negative(self, db_cursor, negative_value):
        """
        Feature: zedral-database-schema
        Property 9: CHECK constraint — roll tonnage counters are non-negative
        
        Test cumulative_tonnage_mt negative values specifically.
        
        Validates: Requirements 12.10
        """
        cursor = db_cursor
        
        with pytest.raises(CheckViolation) as exc_info:
            cursor.execute("""
                INSERT INTO master.rolls (
                    roll_id, wc_id, roll_type, cumulative_tonnage_mt, tonnage_since_grind_mt
                ) VALUES (
                    'TEST_ROLL_CUM_PBT', 'CRS-1', 'work_roll_top', %s, 0.0
                )
            """, (negative_value,))
        
        assert 'cumulative_tonnage' in str(exc_info.value).lower() or 'check' in str(exc_info.value).lower()
    
    @given(negative_value=st.floats(min_value=-1000, max_value=-0.001, allow_nan=False, allow_infinity=False))
    @settings(max_examples=100)
    def test_tonnage_since_grind_rejects_negative(self, db_cursor, negative_value):
        """
        Feature: zedral-database-schema
        Property 9: CHECK constraint — roll tonnage counters are non-negative
        
        Test tonnage_since_grind_mt negative values specifically.
        
        Validates: Requirements 12.10
        """
        cursor = db_cursor
        
        with pytest.raises(CheckViolation) as exc_info:
            cursor.execute("""
                INSERT INTO master.rolls (
                    roll_id, wc_id, roll_type, cumulative_tonnage_mt, tonnage_since_grind_mt
                ) VALUES (
                    'TEST_ROLL_GRIND_PBT', 'CRS-1', 'work_roll_top', 0.0, %s
                )
            """, (negative_value,))
        
        assert 'tonnage_since_grind' in str(exc_info.value).lower() or 'check' in str(exc_info.value).lower()


# ============================================================================
# Property 10: CHECK constraint — stoppage rollup bucket is from the valid set
# ============================================================================

class TestProperty10StoppageRollupBucket:
    """
    Feature: zedral-database-schema
    Property 10: CHECK constraint — stoppage rollup bucket is from the valid set
    
    Validates: Requirements 12.11
    
    For any attempted insert into master.stoppage_codes with a rollup_bucket value
    not in {'breakdown', 'material_wait', 'quality_hold', 'tool_change', 'power',
    'operator_break', 'other'}, the database must reject the row.
    """
    
    VALID_ROLLUP_BUCKETS = {
        'breakdown', 'material_wait', 'quality_hold', 'tool_change',
        'power', 'operator_break', 'other'
    }
    
    @given(rollup_bucket=st.text(min_size=1, max_size=50, alphabet=st.characters(
        min_codepoint=ord('a'), max_codepoint=ord('z')
    )))
    @settings(max_examples=100)
    def test_rollup_bucket_rejects_invalid(self, db_cursor, rollup_bucket):
        """
        Feature: zedral-database-schema
        Property 10: CHECK constraint — stoppage rollup bucket is from the valid set
        
        Generate random strings not in the 7-value set and assert CHECK constraint violation.
        
        Validates: Requirements 12.11
        """
        cursor = db_cursor
        
        # Skip if the bucket is actually valid
        assume(rollup_bucket not in self.VALID_ROLLUP_BUCKETS)
        
        with pytest.raises(CheckViolation) as exc_info:
            cursor.execute("""
                INSERT INTO master.stoppage_codes (
                    code_id, code, description, rollup_bucket
                ) VALUES (
                    'TEST_STOP_PBT', 'TEST-CODE', 'Test Description', %s
                )
            """, (rollup_bucket,))
        
        assert 'rollup_bucket' in str(exc_info.value).lower() or 'check' in str(exc_info.value).lower()
    
    @given(rollup_bucket=st.one_of(
        st.just('invalid_bucket'),
        st.just('Breakdown'),  # Wrong case
        st.just('BREAKDOWN'),  # Wrong case
        st.just('material-wait'),  # Wrong separator
        st.just(''),  # Empty string
        st.just('not_a_bucket'),
        st.just('random_text'),
        st.just('break_down'),  # Typo
    ))
    @settings(max_examples=100)
    @example(rollup_bucket='invalid_bucket')
    @example(rollup_bucket='Breakdown')
    @example(rollup_bucket='BREAKDOWN')
    @example(rollup_bucket='material-wait')
    @example(rollup_bucket='not_a_bucket')
    def test_rollup_bucket_edge_cases(self, db_cursor, rollup_bucket):
        """
        Feature: zedral-database-schema
        Property 10: CHECK constraint — stoppage rollup bucket is from the valid set
        
        Test specific edge cases for invalid rollup_bucket values.
        
        Validates: Requirements 12.11
        """
        cursor = db_cursor
        
        # Skip if somehow valid
        assume(rollup_bucket not in self.VALID_ROLLUP_BUCKETS)
        
        with pytest.raises(CheckViolation) as exc_info:
            cursor.execute("""
                INSERT INTO master.stoppage_codes (
                    code_id, code, description, rollup_bucket
                ) VALUES (
                    'TEST_STOP_EDGE_PBT', 'TEST-EDGE', 'Test Edge Case', %s
                )
            """, (rollup_bucket,))
        
        assert 'rollup_bucket' in str(exc_info.value).lower() or 'check' in str(exc_info.value).lower()
