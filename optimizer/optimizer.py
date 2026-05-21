from models import Appointment, OptimizerConfig, OrderedAppointment


def optimize_queue(
    appointments: list[Appointment],
    config: OptimizerConfig,
) -> list[OrderedAppointment]:
    if not appointments:
        return []

    match config.strategy:
        case "priority":
            sorted_appts = sorted(
                appointments,
                key=lambda a: (-a.priority, a.scheduled_at),
            )
        case "shortest_job_first":
            sorted_appts = sorted(
                appointments,
                key=lambda a: (a.duration_min, a.scheduled_at),
            )
        case _:  # "earliest"
            sorted_appts = sorted(appointments, key=lambda a: a.scheduled_at)

    return [
        OrderedAppointment(id=appt.id, queue_position=i + 1)
        for i, appt in enumerate(sorted_appts)
    ]
