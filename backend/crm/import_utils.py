from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from django.utils import timezone


def normalize_value(value: Any):
  if value is None:
    return ""
  if str(value) == "NaT":  # Handle pandas NaT
    return ""
  if isinstance(value, float) and (value != value):  # NaN check
    return ""
  if isinstance(value, (datetime,)):
    return value.strftime("%Y-%m-%d")
  return str(value)


def map_row(row: dict) -> dict:
    enquiry_date = parse_date(row.get("Enquiry Date"))
    
    # Try multiple fields for close date
    close_date = parse_date(row.get("Enquiry Closure Date"))
    if not close_date:
        # Fallback to EO/PO Date if available (usually for Won leads)
        close_date = parse_date(row.get("EO/PO Date"))
    
    last_followup = parse_date(row.get("LastFollowupDate"))
    next_followup = parse_date(row.get("Planned Followup Date"))
    updated_source = (
        parse_date(row.get("EO/PO Date"))
        or last_followup
        or enquiry_date
        or timezone.now().date()
    )

    kva_value = parse_decimal(row.get("KVA"))
    quantity = parse_int(row.get("Qty"))

    lead_stage = (row.get("Enquiry Stage") or "").strip()
    enquiry_status = (row.get("EnquiryStatus") or "").strip()
    normalized_status = normalize_status(enquiry_status, lead_stage)

    defaults = {
        "enquiry_id": (row.get("Enquiry No") or "").strip() or (row.get("EnquiryID") or "").strip(),
        "enquiry_date": enquiry_date,
        "close_date": close_date,
        "lead_stage": lead_stage,
        "lead_status": normalized_status,
        "enquiry_type": (row.get("EnquiryType") or "").strip(),
        "dealer": (row.get("Dealer") or "").strip() or (row.get("Dealer Name") or "").strip(),
        "corporate_name": (row.get("Corporate Name") or "").strip(),
        "address": (row.get("Address") or "").strip(),
        "area_office": (row.get("Area Office") or "").strip(),
        "branch": (row.get("Branch") or "").strip(),
        "customer_type": (row.get("Customer Type") or "").strip(),
        "dg_ownership": (row.get("DG Ownership") or "").strip(),
        "district": (row.get("District") or "").strip(),
        "state": (row.get("State") or "").strip(),
        "city": (row.get("Location") or row.get("City") or "").strip(),
        "tehsil": (row.get("Tehsil") or "").strip(),
        "zone": (row.get("Zone") or "").strip(),
        "segment": (row.get("Segment") or "").strip(),
        "sub_segment": (row.get("SubSegment") or "").strip(),
        "source": (row.get("Source") or "").strip(),
        "source_from": (row.get("Source From") or "").strip(),
        "events": (row.get("Events") or "").strip(),
        "finance_company": (row.get("Finance Company") or "").strip(),
        "finance_required": normalize_bool(row.get("Finance Required")),
        "owner": (row.get("Employee Name") or "").strip(),
        "owner_code": (row.get("Employee Code") or "").strip(),
        "owner_status": (row.get("Employee Status") or "").strip(),
        "email": str(row.get("Email") or "").strip(),
        "phone_number": str(row.get("Phone Number") or "").strip(),
        "pan_number": str(row.get("PAN NO.") or "").strip(),
        "phase": str(row.get("Phase") or "").strip(),
        "pincode": str(row.get("PinCode") or "").strip(),
        "location": (row.get("Location") or "").strip(),
        "kva": kva_value,
        "kva_range": bucket_kva_range(kva_value),
        "quantity": quantity or parse_int(row.get("Quantity")) or 1,
        "order_value": estimate_order_value(kva_value, quantity or 1),
        "win_flag": infer_win_flag(lead_stage),
        "loss_reason": infer_loss_reason(lead_stage, row.get("Remarks")),
        "remarks": (row.get("Remarks") or "").strip(),
        "followup_count": parse_int(row.get("No of Follow-ups")) or parse_int(row.get("FollowupCount")),
        "last_followup_date": last_followup,
        "next_followup_date": next_followup,
        "referred_by": (row.get("Referred By") or "").strip(),
        "uploaded_by": (row.get("Uploaded by") or "").strip(),
        "created_by": (row.get("Created By") or row.get("Upload By") or "").strip(),
        "updated_at": timezone.make_aware(datetime.combine(updated_source, datetime.min.time())),
        "fy": format_fy(enquiry_date),
        "month": format_month(enquiry_date),
        "week": format_week(enquiry_date),
    }
    return defaults


def parse_date(value: str | None):
    if not value:
        return None
    value = str(value).strip()
    if not value or value.lower() == "nan":
        return None
    # Added %d %b %Y (e.g. 01 Apr 2024) and other common formats
    formats = (
        "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
        "%d %b %Y", "%d-%b-%Y", "%d %B %Y", "%d-%B-%Y"
    )
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def parse_int(value):
    try:
        if value in (None, ""):
            return 0
        return int(float(value))
    except (ValueError, TypeError):
        return 0


def parse_decimal(value):
    try:
        if value in (None, ""):
            return None
        return Decimal(str(value))
    except (ValueError, TypeError, ArithmeticError):
        return None


def normalize_bool(value):
    return str(value).strip().lower() in {"yes", "y", "true", "1"}


def normalize_status(status: str, stage: str) -> str:
    closed_keywords = {"closed", "decline", "lost", "order booked", "order received", "won"}
    status_val = (status or "").strip().lower()
    stage_val = (stage or "").strip().lower()
    if any(keyword in status_val for keyword in closed_keywords):
        return "Closed"
    if any(keyword in stage_val for keyword in closed_keywords):
        return "Closed"
    return "Open"


def infer_win_flag(stage: str) -> bool:
    stage_val = (stage or "").lower()
    return "won" in stage_val and "lost" not in stage_val


def infer_loss_reason(stage: str, remarks: str | None) -> str:
    stage_val = (stage or "").lower()
    if "lost" in stage_val:
        return (remarks or "").strip()
    return ""


def bucket_kva_range(kva):
    if kva is None:
        return ""
    value = float(kva)
    if value < 50:
        return "0-50"
    if value < 100:
        return "50-100"
    if value < 200:
        return "100-200"
    if value < 300:
        return "200-300"
    return "300+"


def estimate_order_value(kva, quantity):
    kva_value = float(kva) if kva is not None else 0
    qty = quantity or 1
    approx_value = kva_value * qty * 35000
    return Decimal(str(round(approx_value, 2)))


def format_fy(date_value):
    if not date_value:
        return ""
    return f"FY{date_value.year % 100:02d}"


def format_month(date_value):
    if not date_value:
        return ""
    return date_value.strftime("%b")


def format_week(date_value):
    if not date_value:
        return ""
    week_num = date_value.isocalendar().week
    return f"W{week_num}"


def load_records_from_file(uploaded_file):
    import pandas as pd  # local import to avoid hard dependency at import time

    name = (uploaded_file.name or "").lower()
    if name.endswith(".xlsx") or name.endswith(".xls"):
        df = pd.read_excel(uploaded_file)
    else:
        df = pd.read_csv(uploaded_file)
    df = df.fillna("")
    records = []
    for record in df.to_dict(orient="records"):
        normalized = {}
        for key, value in record.items():
            normalized[key] = normalize_value(value)
        records.append(normalized)
    return records


def serialize_for_preview(mapped: dict, row: dict):
    def _convert(value):
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, datetime):
            return value.date().isoformat()
        return value

    return {
        "enquiry_id": mapped.get("enquiry_id"),
        "dealer": mapped.get("dealer"),
        "segment": mapped.get("segment"),
        "state": mapped.get("state"),
        "kva": _convert(mapped.get("kva")),
        "customer_type": mapped.get("customer_type"),
        "raw": row,
    }

