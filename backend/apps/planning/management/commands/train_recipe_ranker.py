"""Manage command: train the LightGBM recipe ranker and write the artifact."""
from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand

from apps.planning.ml_scoring.training import TrainingConfig, train


class Command(BaseCommand):
    help = 'Train the LightGBM recipe-vs-group ranker model.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            default='ml_models/recipe_ranker.txt',
            help='Path to write the trained model file',
        )
        parser.add_argument(
            '--no-synthetic',
            action='store_true',
            help='Use only real RecipeFeedback rows; skip synthetic data generation',
        )
        parser.add_argument('--seed', type=int, default=42)
        parser.add_argument('--num-boost-round', type=int, default=200)

    def handle(self, *args, **options):
        config = TrainingConfig(
            output_path=Path(options['output']),
            train_synthetic=not options['no_synthetic'],
            real_feedback_only=options['no_synthetic'],
            seed=options['seed'],
            num_boost_round=options['num_boost_round'],
        )
        path = train(config)
        self.stdout.write(self.style.SUCCESS(f'Trained ranker saved to {path}'))
