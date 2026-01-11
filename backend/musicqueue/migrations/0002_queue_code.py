from django.db import migrations, models
import musicqueue.models


class Migration(migrations.Migration):

    dependencies = [
        ("musicqueue", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="queue",
            name="code",
            field=models.CharField(
                default=musicqueue.models.generate_queue_code,
                editable=False,
                max_length=12,
                unique=True,
            ),
        ),
    ]
