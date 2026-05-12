#!/bin/bash
# Zedral — Redpanda topic bootstrap
# Creates all required topics. Idempotent — safe to run multiple times.

set -e

BROKER="${REDPANDA_BROKERS:-redpanda:29092}"

echo "Waiting for Redpanda at $BROKER..."
until rpk cluster health --brokers "$BROKER" > /dev/null 2>&1; do
  sleep 2
done
echo "Redpanda is healthy."

# Helper: create topic + DLQ counterpart if they don't exist
create_topic() {
  local topic=$1
  local partitions=${2:-3}
  local retention_ms=${3:-604800000}  # 7 days default

  rpk topic create "$topic" \
    --brokers "$BROKER" \
    --partitions "$partitions" \
    --replicas 1 \
    --topic-config "retention.ms=$retention_ms" \
    --if-not-exists
  echo "  [ok] $topic"

  rpk topic create "${topic}.dlq" \
    --brokers "$BROKER" \
    --partitions "$partitions" \
    --replicas 1 \
    --topic-config "retention.ms=604800000" \
    --if-not-exists
  echo "  [ok] ${topic}.dlq"
}

echo ""
echo "=== ERP topics ==="
create_topic "erp.work_order.received"
create_topic "erp.work_order.updated"
create_topic "erp.work_order.cancelled"
create_topic "erp.sales_order.received"
create_topic "erp.sales_order.updated"
create_topic "erp.sales_order.cancelled"
create_topic "erp.material_master.updated"
create_topic "erp.sync.requested"
create_topic "erp.sync.completed"

echo ""
echo "=== Master Data topics ==="
create_topic "master.changeover_matrix.updated" 3 2592000000  # 30 days
create_topic "master.calendar.updated"

echo ""
echo "=== Demand topics ==="
create_topic "demand.priority.recalculated"
create_topic "demand.priority.overridden"
create_topic "demand.validation.failed"

echo ""
echo "=== Floor topics ==="
create_topic "floor.dispatch.issued"
create_topic "floor.setup.started"          3 2592000000
create_topic "floor.setup.completed"        3 2592000000
create_topic "floor.production.started"     3 2592000000
create_topic "floor.production.completed"   3 2592000000
create_topic "floor.downtime.started"       3 2592000000
create_topic "floor.downtime.ended"         3 2592000000
create_topic "floor.reject.raised"          3 7776000000  # 90 days
create_topic "floor.quality.measured"       3 7776000000
create_topic "floor.ncr.raised"             3 7776000000
create_topic "floor.shift.handover_submitted"

# v0.2 floor topics
create_topic "floor.pass.started"           3 2592000000
create_topic "floor.pass.completed"         3 2592000000
create_topic "floor.roll.changed"           3 2592000000
create_topic "floor.shift.crew_confirmed"
create_topic "floor.shift_report.signed"
create_topic "floor.shift_report.approved"
create_topic "floor.shift_report.correction_requested"

echo ""
echo "=== Material topics ==="
create_topic "material.coil.staged"         3 2592000000
create_topic "material.coil.consumed"       3 2592000000
create_topic "material.coil.reserved"
create_topic "material.coil.allocated"
create_topic "material.coil.shortage_detected"
create_topic "material.coil.shortage_resolved"

echo ""
echo "=== Asset topics ==="
create_topic "asset.breakdown.reported"     3 7776000000
create_topic "asset.pm.scheduled"           3 2592000000

echo ""
echo "=== Energy topics ==="
create_topic "energy.meter.reading"         3 604800000
create_topic "energy.event.peak_demand"     3 31536000000  # 365 days

echo ""
echo "All topics created successfully."
exit 0
