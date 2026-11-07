package com.workbench;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.LinkedHashSet;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskRepository tasks;
    public TaskController(TaskRepository tasks) { this.tasks = tasks; }

    public record TaskInput(@NotBlank @Size(max = 200) String title,
                            @NotNull @Size(max = 4000) String notes,
                            LocalDate dueDate, @NotNull Task.Priority priority,
                            @NotNull Boolean completed,
                            @Size(max = 10) List<@NotBlank @Size(max = 40) String> labels) { }

    @GetMapping
    public List<Task> list() { return tasks.findAll(Sort.by(Sort.Direction.DESC, "createdAt", "id")); }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Task create(@Valid @RequestBody TaskInput input) { return save(new Task(), input); }

    @PutMapping("/{id}")
    public Task update(@PathVariable Long id, @Valid @RequestBody TaskInput input) {
        return save(find(id), input);
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { tasks.delete(find(id)); }

    private Task find(Long id) {
        return tasks.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Task save(Task task, TaskInput input) {
        task.title = input.title().strip();
        task.notes = input.notes();
        task.dueDate = input.dueDate();
        task.priority = input.priority();
        task.completed = input.completed();
        if (input.labels() != null) {
            task.labels = new LinkedHashSet<>();
            input.labels().forEach(label -> task.labels.add(label.strip().toLowerCase(Locale.ROOT)));
        }
        return tasks.save(task);
    }
}
