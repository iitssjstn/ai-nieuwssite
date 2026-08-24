import { NextResponse } from "next/server";
import { getAutomationSettings, setAutomationSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAutomationSettings());
}

export async function PATCH(request) {
  const {
    enabled, max_per_source, auto_publish, auto_publish_min_confidence,
    auto_gather_sources, auto_update_published, auto_update_min_confidence,
    use_source_image, poll_interval_minutes, active_hours_enabled,
    active_hours_start, active_hours_end, backup_frequency_hours,
  } = await request.json();
  if (max_per_source !== undefined && (max_per_source < 1 || max_per_source > 20)) {
    return NextResponse.json({ error: "max_per_source moet tussen 1 en 20 liggen" }, { status: 400 });
  }
  if (auto_publish_min_confidence !== undefined && (auto_publish_min_confidence < 0 || auto_publish_min_confidence > 1)) {
    return NextResponse.json({ error: "auto_publish_min_confidence moet tussen 0 en 1 liggen" }, { status: 400 });
  }
  if (auto_update_min_confidence !== undefined && (auto_update_min_confidence < 0 || auto_update_min_confidence > 1)) {
    return NextResponse.json({ error: "auto_update_min_confidence moet tussen 0 en 1 liggen" }, { status: 400 });
  }
  if (poll_interval_minutes !== undefined && (poll_interval_minutes < 1 || poll_interval_minutes > 1440)) {
    return NextResponse.json({ error: "poll_interval_minutes moet tussen 1 en 1440 liggen" }, { status: 400 });
  }
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (active_hours_start !== undefined && !timeRegex.test(active_hours_start)) {
    return NextResponse.json({ error: "active_hours_start must be a valid time (HH:MM)" }, { status: 400 });
  }
  if (active_hours_end !== undefined && !timeRegex.test(active_hours_end)) {
    return NextResponse.json({ error: "active_hours_end must be a valid time (HH:MM)" }, { status: 400 });
  }
  if (backup_frequency_hours !== undefined && (backup_frequency_hours < 1 || backup_frequency_hours > 168)) {
    return NextResponse.json({ error: "backup_frequency_hours moet tussen 1 en 168 liggen" }, { status: 400 });
  }
  setAutomationSettings({
    enabled, max_per_source, auto_publish, auto_publish_min_confidence,
    auto_gather_sources, auto_update_published, auto_update_min_confidence,
    use_source_image, poll_interval_minutes, active_hours_enabled,
    active_hours_start, active_hours_end, backup_frequency_hours,
  });
  return NextResponse.json(getAutomationSettings());
}
