from __future__ import annotations

import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from crm.import_utils import map_row
from crm.models import Lead


class Command(BaseCommand):
    help = "Import CRM leads from a CSV export"

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="Path to CSV export")
        parser.add_argument(
            "--truncate",
            action="store_true",
            help="Delete existing leads before import",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv_path"])
        if not csv_path.exists():
            raise CommandError(f"File not found: {csv_path}")

        if options["truncate"]:
            self.stdout.write("Truncating existing leads…")
            Lead.objects.all().delete()

        with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            row_count = 0
            created = 0
            updated = 0

            with transaction.atomic():
                for row in reader:
                    row_count += 1
                    defaults = map_row(row)
                    enquiry_id = defaults.get("enquiry_id")
                    if not enquiry_id:
                        continue

                    _, is_created = Lead.objects.update_or_create(
                        enquiry_id=enquiry_id,
                        defaults=defaults,
                    )

                    if is_created:
                        created += 1
                    else:
                        updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Processed {row_count} rows • created {created} • updated {updated}"
            )
        )

