package com.workbench;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/labels")
public class LabelController {
    private final LabelRepository labels;
    private final TaskRepository tasks;

    public LabelController(LabelRepository labels, TaskRepository tasks) {
        this.labels = labels;
        this.tasks = tasks;
    }

    public record LabelInput(@NotBlank @Size(max = 40) String name,
                             @NotNull @Pattern(regexp = "#[0-9a-fA-F]{6}") String color) { }
    public record ColorInput(@NotNull @Pattern(regexp = "#[0-9a-fA-F]{6}") String color) { }

    @GetMapping
    public List<LabelDefinition> list() { return labels.findAll(Sort.by("name")); }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public LabelDefinition create(@Valid @RequestBody LabelInput input) {
        String name = LabelService.normalize(input.name());
        if (labels.findByName(name).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT);
        LabelDefinition label = new LabelDefinition();
        label.name = name;
        label.color = input.color().toLowerCase(Locale.ROOT);
        try { return labels.saveAndFlush(label); }
        catch (DataIntegrityViolationException e) { throw new ResponseStatusException(HttpStatus.CONFLICT); }
    }

    @PutMapping("/{id}")
    public LabelDefinition recolor(@PathVariable Long id, @Valid @RequestBody ColorInput input) {
        LabelDefinition label = find(id);
        label.color = input.color().toLowerCase(Locale.ROOT);
        return labels.save(label);
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void delete(@PathVariable Long id) {
        LabelDefinition label = find(id);
        for (Task task : tasks.findAll()) task.labels.remove(label.name);
        labels.delete(label);
    }

    private LabelDefinition find(Long id) {
        return labels.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
