"""Init database schema

Revision ID: init_schema
Revises:
Create Date: 2023-05-21 11:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "init_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create projects table
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("owner", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("repository_url", sa.String(length=512), nullable=False),
        sa.Column("homepage_url", sa.String(length=512), nullable=True),
        sa.Column("language", sa.String(length=100), nullable=True),
        sa.Column("stars_count", sa.Integer(), nullable=True, default=0),
        sa.Column("forks_count", sa.Integer(), nullable=True, default=0),
        sa.Column("trending_date", sa.DateTime(), nullable=True),
        sa.Column("last_updated", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("full_name"),
    )
    op.create_index(op.f("ix_projects_id"), "projects", ["id"], unique=False)

    # Create tags table
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_tags_id"), "tags", ["id"], unique=False)

    # Create project insights table (contains all new fields)
    op.create_table(
        "project_insights",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("business_value", sa.Text(), nullable=True),
        sa.Column("market_opportunity", sa.Text(), nullable=True),
        sa.Column("startup_ideas", sa.Text(), nullable=True),
        sa.Column("target_audience", sa.Text(), nullable=True),
        sa.Column("competition_analysis", sa.Text(), nullable=True),
        sa.Column("analysis_version", sa.String(length=50), nullable=True),
        sa.Column("analysis_status", sa.String(), nullable=True, server_default="success"),
        sa.Column("language", sa.String(length=10), nullable=False, server_default="en"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_updated", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_project_insights_id"), "project_insights", ["id"], unique=False)

    # Create compound index for project_id and language
    op.create_index(
        "ix_project_insights_project_id_language",
        "project_insights",
        ["project_id", "language"],
        unique=True,
    )

    # Create project-tag association table
    op.create_table(
        "project_tag",
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"],
            ["tags.id"],
        ),
        sa.PrimaryKeyConstraint("project_id", "tag_id"),
    )


def downgrade():
    # Drop tables in reverse order of creation
    op.drop_table("project_tag")
    op.drop_index("ix_project_insights_project_id_language", table_name="project_insights")
    op.drop_index(op.f("ix_project_insights_id"), table_name="project_insights")
    op.drop_table("project_insights")
    op.drop_index(op.f("ix_tags_id"), table_name="tags")
    op.drop_table("tags")
    op.drop_index(op.f("ix_projects_id"), table_name="projects")
    op.drop_table("projects")
