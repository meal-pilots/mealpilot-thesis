from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0003_recipe_canonical_url_recipe_language_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='recipe',
            name='quality_score',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='ETL-derived quality score [0..1]; planner only consumes recipes above the configured threshold.',
                max_digits=4,
            ),
        ),
        migrations.AddField(
            model_name='recipe',
            name='quality_breakdown',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Component scores explaining quality_score (nutrition coverage, ingredient match, etc).',
            ),
        ),
        migrations.AddIndex(
            model_name='recipe',
            index=models.Index(fields=['status', 'quality_score'], name='catalog_rec_status_qual_idx'),
        ),
    ]
