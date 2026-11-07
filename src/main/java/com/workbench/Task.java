package com.workbench;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "tasks")
public class Task {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false, length = 200)
    public String title;
    @Column(nullable = false, length = 4000)
    public String notes = "";
    public LocalDate dueDate;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(16) default 'DAILY'")
    public TaskType taskType = TaskType.DAILY;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    public Priority priority = Priority.MEDIUM;
    @Column(nullable = false)
    public boolean completed;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "task_labels", joinColumns = @JoinColumn(name = "task_id"))
    @Column(name = "label", nullable = false, length = 40)
    public Set<String> labels = new LinkedHashSet<>();
    @Column(nullable = false, updatable = false)
    public Instant createdAt = Instant.now();
    public enum TaskType { DAILY, WEEKLY, MONTHLY }
    public enum Priority { LOW, MEDIUM, HIGH }
}
