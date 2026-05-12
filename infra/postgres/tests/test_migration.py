"""Migration smoke tests and idempotency tests for Zedral Database Schema.

Tests cover:
- Migration smoke test (apply, verify zero errors, verify table counts)
- Idempotency test (apply twice, verify no errors, seed row counts unchanged)
- Seed data verification tests
- Extension verification test
- Index existence test
- FK constraint test
- Cascade delete test

Feature: zedral-database-schema
"""
from __future__ import annotations

import pytest
import psycopg2
from psycopg2 import sql
from psycopg2.errors import ForeignKeyViolation, CheckViolation


# ============================================================================
# Test 6.2: Migration Smoke Test
# ============================================================================

class TestMigrationSmoke:
    """
    Migration smoke test: apply migration, verify zero errors, verify table counts.
    
    Validates: Requirements 10.10, 10.11
    """

    def test_migration_applies_without_errors(self, fresh_database):
        """
        Feature: zedral-database-schema
        Test: Migration applies without errors to fresh PostgreSQL 16 + TimescaleDB.
        
        Validates: Requirements 10.10
        """
        # If we got here, the migration already applied successfully
        # The fresh_database fixture would have failed if migration had errors
        conn = psycopg2.connect(
            host=fresh_database["host"],
            port=fresh_database["port"],
            user=fresh_database["user"],
            password=fresh_database["password"],
            dbname=fresh_database["dbname"]
        )
        
        try:
            cursor = conn.cursor()
            
            # Verify schemas exist
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name IN ('master', 'm1_demand', 'm5a_material', 'm6_dispatch')
                ORDER BY schema_name
            """)
            schemas = [row[0] for row in cursor.fetchall()]
            
            assert 'master' in schemas, "master schema not created"
            assert 'm1_demand' in schemas, "m1_demand schema not created"
            assert 'm5a_material' in schemas, "m5a_material schema not created"
            assert 'm6_dispatch' in schemas, "m6_dispatch schema not created"
            
            cursor.close()
        finally:
            conn.close()

    def test_table_counts_per_schema(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: Table counts match expected values per schema.
        
        Expected counts: master=14, m1_demand=8, m5a_material=8, m6_dispatch=12
        
        Validates: Requirements 10.11
        """
        cursor = db_cursor
        
        expected_counts = {
            'master': 14,
            'm1_demand': 8,
            'm5a_material': 8,
            'm6_dispatch': 12
        }
        
        for schema_name, expected_count in expected_counts.items():
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


# ============================================================================
# Test 6.3: Idempotency Test
# ============================================================================

class TestIdempotency:
    """
    Idempotency test: apply migration twice, verify no errors, verify seed row counts unchanged.
    
    Validates: Requirements 1.10, 10.4, 10.5, 10.7, 10.8
    """

    def test_migration_idempotency(self, fresh_database, migration_sql):
        """
        Feature: zedral-database-schema
        Property 2: Migration idempotency
        
        Apply migration to fresh DB, record counts, apply again, verify:
        - Zero errors on second run
        - Identical table counts
        - Identical seed row counts (no duplicates from ON CONFLICT DO NOTHING)
        
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
            
            # Get initial counts
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
                    cursor.execute(sql.SQL("SELECT COUNT(*) FROM {}.{}").format(
                        sql.Identifier(schema), sql.Identifier(tbl)
                    ))
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
                # Execute the migration again
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
                
                # Verify table counts match
                assert initial_table_counts == final_table_counts, (
                    f"Table counts changed after second migration: "
                    f"initial={initial_table_counts}, final={final_table_counts}"
                )
                
                # Verify seed counts match (no duplicates)
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
# Test 6.4: Seed Data Verification Tests
# ============================================================================

class TestSeedData:
    """
    Seed data verification tests for all seeded tables.
    
    Validates: Requirements 2.15, 2.16, 2.17, 2.18, 2.19, 7.13
    """

    def test_plants_seed_data(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: master.plants has 1 row with correct plant_id.
        
        Validates: Requirements 2.15
        """
        cursor = db_cursor
        
        cursor.execute("SELECT COUNT(*) FROM master.plants")
        assert cursor.fetchone()[0] == 1, "Expected exactly 1 row in master.plants"
        
        cursor.execute("SELECT plant_id, name, location, timezone FROM master.plants")
        row = cursor.fetchone()
        
        assert row[0] == 'hsl_ludhiana', f"Expected plant_id 'hsl_ludhiana', got '{row[0]}'"
        assert row[1] == 'Hero Steels Limited', f"Expected name 'Hero Steels Limited', got '{row[1]}'"
        assert row[2] == 'Ludhiana', f"Expected location 'Ludhiana', got '{row[2]}'"
        assert row[3] == 'Asia/Kolkata', f"Expected timezone 'Asia/Kolkata', got '{row[3]}'"

    def test_work_centres_seed_data(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: master.work_centres has 3 rows (CRS-1, CRS-2, CRS-3) with correct gauge/width ranges.
        
        Validates: Requirements 2.16
        """
        cursor = db_cursor
        
        cursor.execute("SELECT COUNT(*) FROM master.work_centres")
        assert cursor.fetchone()[0] == 3, "Expected exactly 3 rows in master.work_centres"
        
        # CRS-1: 0.15–2.0mm, 600–1350mm
        cursor.execute("""
            SELECT gauge_min_mm, gauge_max_mm, width_min_mm, width_max_mm 
            FROM master.work_centres WHERE wc_id = 'CRS-1'
        """)
        row = cursor.fetchone()
        assert row is not None, "CRS-1 not found"
        assert row[0] == 0.15, f"CRS-1 gauge_min_mm expected 0.15, got {row[0]}"
        assert row[1] == 2.0, f"CRS-1 gauge_max_mm expected 2.0, got {row[1]}"
        assert row[2] == 600, f"CRS-1 width_min_mm expected 600, got {row[2]}"
        assert row[3] == 1350, f"CRS-1 width_max_mm expected 1350, got {row[3]}"
        
        # CRS-2: 0.15–2.0mm, 600–1350mm
        cursor.execute("""
            SELECT gauge_min_mm, gauge_max_mm, width_min_mm, width_max_mm 
            FROM master.work_centres WHERE wc_id = 'CRS-2'
        """)
        row = cursor.fetchone()
        assert row is not None, "CRS-2 not found"
        assert row[0] == 0.15, f"CRS-2 gauge_min_mm expected 0.15, got {row[0]}"
        assert row[1] == 2.0, f"CRS-2 gauge_max_mm expected 2.0, got {row[1]}"
        
        # CRS-3: 0.20–3.0mm, 600–1350mm (temper)
        cursor.execute("""
            SELECT gauge_min_mm, gauge_max_mm, width_min_mm, width_max_mm, wc_type 
            FROM master.work_centres WHERE wc_id = 'CRS-3'
        """)
        row = cursor.fetchone()
        assert row is not None, "CRS-3 not found"
        assert row[0] == 0.20, f"CRS-3 gauge_min_mm expected 0.20, got {row[0]}"
        assert row[1] == 3.0, f"CRS-3 gauge_max_mm expected 3.0, got {row[1]}"
        assert row[4] == 'temper', f"CRS-3 wc_type expected 'temper', got '{row[4]}'"

    def test_stoppage_codes_seed_data(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: master.stoppage_codes has exactly 16 rows, all 7 rollup buckets represented.
        
        Validates: Requirements 2.18
        """
        cursor = db_cursor
        
        cursor.execute("SELECT COUNT(*) FROM master.stoppage_codes")
        assert cursor.fetchone()[0] == 16, "Expected exactly 16 rows in master.stoppage_codes"
        
        # Verify all 7 rollup buckets are represented
        cursor.execute("""
            SELECT DISTINCT rollup_bucket 
            FROM master.stoppage_codes 
            ORDER BY rollup_bucket
        """)
        buckets = [row[0] for row in cursor.fetchall()]
        
        expected_buckets = [
            'breakdown', 'material_wait', 'quality_hold', 
            'tool_change', 'power', 'operator_break', 'other'
        ]
        
        for bucket in expected_buckets:
            assert bucket in buckets, f"Missing rollup_bucket '{bucket}'"

    def test_defect_codes_seed_data(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: master.defect_codes has at least 20 rows.
        
        Validates: Requirements 2.19
        """
        cursor = db_cursor
        
        cursor.execute("SELECT COUNT(*) FROM master.defect_codes")
        count = cursor.fetchone()[0]
        assert count >= 20, f"Expected at least 20 rows in master.defect_codes, got {count}"

    def test_emission_factors_seed_data(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: master.emission_factors has row with factor_id = 'cea_grid_FY26', kg_co2e_per_kwh = 0.82.
        
        Validates: Requirements 2.17
        """
        cursor = db_cursor
        
        cursor.execute("""
            SELECT factor_id, kg_co2e_per_kwh, scope, source 
            FROM master.emission_factors 
            WHERE factor_id = 'cea_grid_FY26'
        """)
        row = cursor.fetchone()
        
        assert row is not None, "Emission factor 'cea_grid_FY26' not found"
        assert float(row[1]) == 0.82, f"Expected kg_co2e_per_kwh = 0.82, got {row[1]}"
        assert row[2] == '2', f"Expected scope = '2', got '{row[2]}'"
        assert row[3] == 'CEA', f"Expected source = 'CEA', got '{row[3]}'"

    def test_dispatch_config_seed_data(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: m6_dispatch.config has 5 config keys present.
        
        Validates: Requirements 7.13
        """
        cursor = db_cursor
        
        cursor.execute("SELECT COUNT(*) FROM m6_dispatch.config")
        assert cursor.fetchone()[0] == 5, "Expected exactly 5 rows in m6_dispatch.config"
        
        # Verify expected keys
        cursor.execute("SELECT config_key FROM m6_dispatch.config ORDER BY config_key")
        keys = [row[0] for row in cursor.fetchall()]
        
        expected_keys = [
            'dispatch_horizon_hours',
            'frozen_window_minutes',
            'rush_inject_requires_supervisor',
            'shift_start_times',
            'stoppage_reason_required_min'
        ]
        
        assert keys == expected_keys, f"Expected config keys {expected_keys}, got {keys}"


# ============================================================================
# Test 6.5: Extension Verification Test
# ============================================================================

class TestExtensions:
    """
    Extension verification test.
    
    Validates: Requirements 1.2, 1.3, 10.6
    """

    def test_extensions_exist(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: Verify timescaledb and pgcrypto extensions are present.
        
        Validates: Requirements 1.2, 1.3, 10.6
        """
        cursor = db_cursor
        
        cursor.execute("""
            SELECT extname 
            FROM pg_extension 
            WHERE extname IN ('timescaledb', 'pgcrypto')
            ORDER BY extname
        """)
        
        extensions = [row[0] for row in cursor.fetchall()]
        
        assert 'timescaledb' in extensions, "timescaledb extension not found"
        assert 'pgcrypto' in extensions, "pgcrypto extension not found"


# ============================================================================
# Test 6.6: Index Existence Test
# ============================================================================

class TestIndexExistence:
    """
    Index existence test for all documented indexes.
    
    Validates: Requirements 2.20, 3.9, 6.9, 7.14, 11.1–11.10
    """

    def test_master_schema_indexes(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: Verify all documented indexes exist in master schema.
        
        Validates: Requirements 2.20
        """
        cursor = db_cursor
        
        expected_indexes = [
            ('master', 'idx_changeover_matrix_lookup', 'changeover_matrix'),
            ('master', 'idx_resource_calendars_lookup', 'resource_calendars'),
        ]
        
        for schema, index_name, table_name in expected_indexes:
            cursor.execute("""
                SELECT 1 
                FROM pg_indexes 
                WHERE schemaname = %s 
                AND indexname = %s
                AND tablename = %s
            """, (schema, index_name, table_name))
            
            assert cursor.fetchone() is not None, (
                f"Index '{index_name}' on {schema}.{table_name} not found"
            )

    def test_m1_demand_schema_indexes(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: Verify all documented indexes exist in m1_demand schema.
        
        Validates: Requirements 3.9
        """
        cursor = db_cursor
        
        expected_indexes = [
            ('m1_demand', 'idx_sales_orders_customer', 'sales_orders'),
            ('m1_demand', 'idx_sales_orders_sap_modified', 'sales_orders'),
            ('m1_demand', 'idx_work_orders_priority_queue', 'work_orders'),
            ('m1_demand', 'idx_work_orders_required_date', 'work_orders'),
            ('m1_demand', 'idx_work_orders_sap_modified', 'work_orders'),
            ('m1_demand', 'idx_priority_score_history_wo', 'priority_score_history'),
            ('m1_demand', 'idx_priority_overrides_active', 'priority_overrides'),
        ]
        
        for schema, index_name, table_name in expected_indexes:
            cursor.execute("""
                SELECT 1 
                FROM pg_indexes 
                WHERE schemaname = %s 
                AND indexname = %s
                AND tablename = %s
            """, (schema, index_name, table_name))
            
            assert cursor.fetchone() is not None, (
                f"Index '{index_name}' on {schema}.{table_name} not found"
            )

    def test_m5a_material_schema_indexes(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: Verify all documented indexes exist in m5a_material schema.
        
        Validates: Requirements 6.9
        """
        cursor = db_cursor
        
        expected_indexes = [
            ('m5a_material', 'idx_coils_stage', 'coils'),
            ('m5a_material', 'idx_coils_material_dims', 'coils'),
            ('m5a_material', 'idx_coils_reserved', 'coils'),
            ('m5a_material', 'idx_coils_stage_quality_hold', 'coils'),
            ('m5a_material', 'idx_coil_stage_history_coil', 'coil_stage_history'),
            ('m5a_material', 'idx_wo_readiness_status', 'wo_readiness'),
            ('m5a_material', 'idx_pre_allocations_coil_active', 'pre_allocations'),
            ('m5a_material', 'idx_pre_allocations_wo_active', 'pre_allocations'),
            ('m5a_material', 'idx_inbound_expected_unreceived', 'inbound_expected'),
        ]
        
        for schema, index_name, table_name in expected_indexes:
            cursor.execute("""
                SELECT 1 
                FROM pg_indexes 
                WHERE schemaname = %s 
                AND indexname = %s
                AND tablename = %s
            """, (schema, index_name, table_name))
            
            assert cursor.fetchone() is not None, (
                f"Index '{index_name}' on {schema}.{table_name} not found"
            )

    def test_m6_dispatch_schema_indexes(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: Verify all documented indexes exist in m6_dispatch schema.
        
        Validates: Requirements 7.14
        """
        cursor = db_cursor
        
        expected_indexes = [
            ('m6_dispatch', 'idx_dispatch_lists_shift', 'dispatch_lists'),
            ('m6_dispatch', 'idx_dispatch_items_sequence', 'dispatch_items'),
            ('m6_dispatch', 'idx_dispatch_items_wo', 'dispatch_items'),
            ('m6_dispatch', 'idx_execution_events_wc_time', 'execution_events'),
            ('m6_dispatch', 'idx_execution_events_dispatch_item', 'execution_events'),
            ('m6_dispatch', 'idx_execution_events_type_time', 'execution_events'),
            ('m6_dispatch', 'idx_execution_events_recorded', 'execution_events'),
            ('m6_dispatch', 'idx_stoppages_wc_time', 'stoppages'),
            ('m6_dispatch', 'idx_stoppages_active', 'stoppages'),
            ('m6_dispatch', 'idx_rejects_wc_time', 'rejects'),
            ('m6_dispatch', 'idx_rejects_dispatch_item', 'rejects'),
            ('m6_dispatch', 'idx_shift_handovers_wc_date', 'shift_handovers'),
            ('m6_dispatch', 'idx_setup_timings_matrix_learning', 'setup_timings'),
            ('m6_dispatch', 'idx_production_passes_item', 'production_passes'),
            ('m6_dispatch', 'idx_roll_assignments_dispatch_item', 'roll_assignments'),
            ('m6_dispatch', 'idx_roll_assignments_roll', 'roll_assignments'),
            ('m6_dispatch', 'idx_roll_changes_wc_time', 'roll_changes'),
            ('m6_dispatch', 'idx_shift_crew_assignments_shift', 'shift_crew_assignments'),
        ]
        
        for schema, index_name, table_name in expected_indexes:
            cursor.execute("""
                SELECT 1 
                FROM pg_indexes 
                WHERE schemaname = %s 
                AND indexname = %s
                AND tablename = %s
            """, (schema, index_name, table_name))
            
            assert cursor.fetchone() is not None, (
                f"Index '{index_name}' on {schema}.{table_name} not found"
            )


# ============================================================================
# Test 6.7: FK Constraint Test
# ============================================================================

class TestForeignKeyConstraints:
    """
    FK constraint test (stoppages with non-existent stoppage_code_id).
    
    Validates: Requirements 7.4
    """

    def test_stoppage_fk_violation(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: Attempt insert into m6_dispatch.stoppages with non-existent stoppage_code_id.
        
        The database must reject the row with a FK violation.
        
        Validates: Requirements 7.4
        """
        cursor = db_cursor
        
        # Attempt to insert a stoppage with a non-existent stoppage_code_id
        with pytest.raises(ForeignKeyViolation) as exc_info:
            cursor.execute("""
                INSERT INTO m6_dispatch.stoppages (
                    wc_id, started_at, reason_category, reported_by, stoppage_code_id
                ) VALUES (
                    'CRS-1', 
                    NOW(), 
                    'test_category', 
                    'test_operator',
                    'NON_EXISTENT_CODE'
                )
            """)
        
        assert 'stoppage_codes' in str(exc_info.value).lower() or 'foreign key' in str(exc_info.value).lower(), (
            f"Expected FK violation for stoppage_code_id, got: {exc_info.value}"
        )


# ============================================================================
# Test 6.8: Cascade Delete Test
# ============================================================================

class TestCascadeDelete:
    """
    Cascade delete test (sales_orders → sales_order_items).
    
    Validates: Requirements 3.2
    """

    def test_sales_order_cascade_delete(self, db_cursor):
        """
        Feature: zedral-database-schema
        Test: Insert a sales order with items, delete the sales order, 
              assert items are also deleted.
        
        Validates: Requirements 3.2
        """
        cursor = db_cursor
        
        # First, insert prerequisite data (customer, material)
        cursor.execute("""
            INSERT INTO master.customers (customer_id, name, priority_class)
            VALUES ('TEST_CUSTOMER', 'Test Customer', 'A')
            ON CONFLICT (customer_id) DO NOTHING
        """)
        
        cursor.execute("""
            INSERT INTO master.materials (material_code, description, grade)
            VALUES ('TEST_MAT_001', 'Test Material', 'IS513-CR1')
            ON CONFLICT (material_code) DO NOTHING
        """)
        
        # Insert a sales order
        cursor.execute("""
            INSERT INTO m1_demand.sales_orders (
                so_id, sap_so_ref, customer_id, order_date, required_date,
                total_qty_mt, status, sap_modified_at
            ) VALUES (
                'TEST_SO_001', 
                'SAP_REF_001', 
                'TEST_CUSTOMER', 
                CURRENT_DATE, 
                CURRENT_DATE + INTERVAL '7 days',
                100.0, 
                'open', 
                NOW()
            )
        """)
        
        # Insert sales order items
        cursor.execute("""
            INSERT INTO m1_demand.sales_order_items (
                so_id, item_no, material_code, grade, gauge_mm, width_mm, qty_mt
            ) VALUES 
                ('TEST_SO_001', 1, 'TEST_MAT_001', 'IS513-CR1', 0.5, 1000, 50.0),
                ('TEST_SO_001', 2, 'TEST_MAT_001', 'IS513-CR1', 0.8, 1200, 50.0)
        """)
        
        # Verify items exist
        cursor.execute("""
            SELECT COUNT(*) FROM m1_demand.sales_order_items WHERE so_id = 'TEST_SO_001'
        """)
        assert cursor.fetchone()[0] == 2, "Expected 2 sales order items before delete"
        
        # Delete the sales order
        cursor.execute("""
            DELETE FROM m1_demand.sales_orders WHERE so_id = 'TEST_SO_001'
        """)
        
        # Verify items are cascade deleted
        cursor.execute("""
            SELECT COUNT(*) FROM m1_demand.sales_order_items WHERE so_id = 'TEST_SO_001'
        """)
        assert cursor.fetchone()[0] == 0, "Expected sales order items to be cascade deleted"
        
        cursor.connection.commit()
