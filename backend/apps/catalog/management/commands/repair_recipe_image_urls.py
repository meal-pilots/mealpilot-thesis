"""
One-shot repair: rewrite recipe image URLs from broken `img1.russianfood.com`
(and `img2.*`) to the working main domain `www.russianfood.com`.

Background: russianfood.com's image-only subdomain has been returning 502
Bad Gateway since spring 2026. The exact same /dycontent/images_upl/... paths
are served correctly from the main domain, so a host swap is enough. Affects
both the curated 5k slice (recipes_enriched.jsonl) and the 90k import from
the HuggingFace `epishchik/RuRecipes-93k` dataset — together ~95k rows.

Implementation: a single bulk UPDATE per host using SQL REPLACE on the
substring `//<bad-host>/` so we (1) only touch URL hosts and never paths,
(2) avoid loading 95k rows into Python, (3) finish in seconds instead of
running ~95k individual UPDATE statements.

Idempotent — safe to run multiple times. Use --dry-run to preview counts.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import connection, transaction

from apps.catalog.models import Recipe


HOST_REWRITES: dict[str, str] = {
    'img1.russianfood.com': 'www.russianfood.com',
    'img2.russianfood.com': 'www.russianfood.com',
}


class Command(BaseCommand):
    help = 'Rewrite broken img*.russianfood.com hosts in Recipe.image_url to www.russianfood.com.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show how many rows would change without writing.',
        )

    def handle(self, *args, **options):
        dry_run: bool = options['dry_run']
        table = Recipe._meta.db_table

        total_affected = 0
        with transaction.atomic():
            with connection.cursor() as cur:
                for bad_host, good_host in HOST_REWRITES.items():
                    bad_marker = f'//{bad_host}/'
                    good_marker = f'//{good_host}/'

                    cur.execute(
                        f'SELECT COUNT(*) FROM "{table}" '
                        f'WHERE image_url LIKE %s',
                        [f'%{bad_marker}%'],
                    )
                    candidates = cur.fetchone()[0]
                    self.stdout.write(
                        self.style.NOTICE(
                            f'{bad_host}: {candidates} row(s) match'
                        )
                    )
                    if candidates == 0 or dry_run:
                        total_affected += candidates
                        continue

                    cur.execute(
                        f'UPDATE "{table}" '
                        f'SET image_url = REPLACE(image_url, %s, %s), '
                        f'    updated_at = NOW() '
                        f'WHERE image_url LIKE %s',
                        [bad_marker, good_marker, f'%{bad_marker}%'],
                    )
                    total_affected += cur.rowcount

        verb = 'would update' if dry_run else 'updated'
        self.stdout.write(
            self.style.SUCCESS(f'{verb} {total_affected} recipe(s) total')
        )
