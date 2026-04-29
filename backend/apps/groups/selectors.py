from .models import Group


def get_group_setup_summary(group: Group) -> dict:
    members = list(group.members.all())
    preferences = getattr(group, 'preferences', None)
    member_constraints = {str(member.id): list(member.constraints.all()) for member in members}

    readiness = 0.0
    readiness += 0.25 if group.name else 0.0
    readiness += 0.25 if members else 0.0
    readiness += 0.25 if preferences else 0.0
    readiness += 0.25 if any(member.constraints.exists() for member in members) else 0.0

    return {
        'group': group,
        'members': members,
        'constraints_by_member': member_constraints,
        'preferences': preferences,
        'readiness_score': round(readiness, 2),
    }
