package com.workbench;

import java.util.Collection;
import java.util.Locale;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LabelService implements ApplicationRunner {
    private final LabelRepository labels;
    private final TaskRepository tasks;

    public LabelService(LabelRepository labels, TaskRepository tasks) {
        this.labels = labels;
        this.tasks = tasks;
    }

    public static String normalize(String name) { return name.strip().toLowerCase(Locale.ROOT); }

    public static String defaultColor(String name) {
        String key = normalize(name).replaceAll("[\\s_-]+", " ");
        return switch (key) {
            case "self improvement", "自我提升", "自我成长" -> "#39a765";
            case "housework", "house work", "家务" -> "#e05263";
            case "company business", "company", "work", "公司业务", "公司事务", "工作" -> "#397fce";
            default -> {
                String[] palette = {"#39a765", "#e05263", "#397fce", "#9860cc", "#d69a26", "#239b95", "#d25799"};
                long hash = 0;
                for (int codePoint : key.codePoints().toArray()) hash = (hash * 31 + codePoint) & 0xffffffffL;
                yield palette[(int) (hash % palette.length)];
            }
        };
    }

    @Transactional
    public void ensureDefined(Collection<String> names) {
        for (String raw : names) {
            String name = normalize(raw);
            if (labels.findByName(name).isEmpty()) {
                LabelDefinition label = new LabelDefinition();
                label.name = name;
                label.color = defaultColor(name);
                labels.save(label);
            }
        }
    }

    @Override @Transactional
    public void run(ApplicationArguments args) {
        // Retain labels on existing tasks when upgrading from the free-text editor.
        for (Task task : tasks.findAll()) ensureDefined(task.labels);
    }
}
