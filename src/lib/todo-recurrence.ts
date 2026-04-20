import type { CareTodo } from "@/lib/types";

type RecurrenceTodo = Pick<
  CareTodo,
  "frequency" | "due_date" | "recurrence_interval"
>;

type VisibleTodo = RecurrenceTodo & Pick<CareTodo, "status">;

export function isUntilDone(
  todo: Pick<CareTodo, "frequency" | "due_date">,
): boolean {
  return todo.frequency === "once" && !todo.due_date;
}

export function todoOccursOn(todo: RecurrenceTodo, dateKey: string): boolean {
  if (todo.frequency === "daily") return false;
  if (isUntilDone(todo)) return false;
  if (!todo.due_date) return false;
  if (todo.frequency === "once") return todo.due_date === dateKey;
  const start = new Date(todo.due_date + "T00:00:00");
  const cur = new Date(dateKey + "T00:00:00");
  if (cur < start) return false;
  const interval = todo.recurrence_interval || 1;
  if (todo.frequency === "weekly") {
    const daysDiff = Math.round(
      (cur.getTime() - start.getTime()) / 86400000,
    );
    return daysDiff % (7 * interval) === 0;
  }
  if (todo.frequency === "monthly") {
    const monthsDiff =
      (cur.getFullYear() - start.getFullYear()) * 12 +
      (cur.getMonth() - start.getMonth());
    return monthsDiff % interval === 0 && cur.getDate() === start.getDate();
  }
  return false;
}

export function todoVisibleOnDate(
  todo: VisibleTodo,
  dateKey: string,
  todayKey: string,
): boolean {
  if (todo.status === "dismissed") return false;
  if (todo.frequency === "daily") return false;
  if (isUntilDone(todo)) {
    if (todo.status === "completed") return false;
    return dateKey === todayKey;
  }
  return todoOccursOn(todo, dateKey);
}
