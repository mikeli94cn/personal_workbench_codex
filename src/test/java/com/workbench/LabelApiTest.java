package com.workbench;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:tests;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class LabelApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired TaskRepository tasks;
    @Autowired LabelRepository labels;
    @Autowired LabelService labelService;

    @BeforeEach void reset() { tasks.deleteAll(); labels.deleteAll(); }

    @Test void definitionsPersistWithoutTasksAndRejectDuplicates() throws Exception {
        String body = mvc.perform(post("/api/labels").contentType("application/json")
                .content("{\"name\":\"  Housework  \",\"color\":\"#FF6688\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("housework"))
            .andExpect(jsonPath("$.color").value("#ff6688")).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).get("id").asLong();
        mvc.perform(get("/api/labels")).andExpect(jsonPath("$[0].id").value(id));
        assertEquals(0, tasks.count());
        mvc.perform(post("/api/labels").contentType("application/json")
                .content("{\"name\":\"HOUSEWORK\",\"color\":\"#000000\"}"))
            .andExpect(status().isConflict());
    }

    @Test void recoloringAndDeletingDefinitionsPreserveTasks() throws Exception {
        String taskBody = mvc.perform(post("/api/tasks").contentType("application/json")
                .content("{\"title\":\"Clean\",\"notes\":\"Keep these notes\",\"priority\":\"HIGH\",\"completed\":false,\"labels\":[\"housework\",\"health\"]}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long taskId = json.readTree(taskBody).get("id").asLong();
        long id = labels.findByName("housework").orElseThrow().id;
        mvc.perform(put("/api/labels/" + id).contentType("application/json").content("{\"color\":\"#112233\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.color").value("#112233"));
        assertEquals("#112233", labels.findById(id).orElseThrow().color);
        mvc.perform(get("/api/tasks")).andExpect(jsonPath("$[0].labels.length()").value(2));
        mvc.perform(delete("/api/labels/" + id)).andExpect(status().isNoContent());
        Task task = tasks.findById(taskId).orElseThrow();
        assertEquals(java.util.Set.of("health"), task.labels);
        assertEquals("Keep these notes", task.notes);
        assertTrue(labels.findByName("housework").isEmpty());
        mvc.perform(put("/api/labels/" + id).contentType("application/json").content("{\"color\":\"#112233\"}"))
            .andExpect(status().isNotFound());
    }

    @Test void existingTaskLabelsAreImportedWithStableDefaults() throws Exception {
        Task task = new Task(); task.title = "Existing task";
        task.labels.addAll(java.util.Set.of("self-improvement", "家务", "company business"));
        tasks.save(task);
        labelService.run(null);
        assertEquals("#39a765", labels.findByName("self-improvement").orElseThrow().color);
        assertEquals("#e05263", labels.findByName("家务").orElseThrow().color);
        assertEquals("#397fce", labels.findByName("company business").orElseThrow().color);
        labelService.run(null);
        assertEquals(3, labels.count());
        assertEquals(3, tasks.findById(task.id).orElseThrow().labels.size());
    }

    @Test void invalidNamesAndColorsAreRejected() throws Exception {
        for (String body : new String[]{
            "{\"name\":\"  \",\"color\":\"#112233\"}",
            "{\"name\":\"x\",\"color\":\"red\"}",
            "{\"name\":\"x\",\"color\":\"#fff\"}",
            "{\"name\":\"x\",\"color\":null}",
            "{\"name\":\"" + "x".repeat(41) + "\",\"color\":\"#112233\"}"
        }) mvc.perform(post("/api/labels").contentType("application/json").content(body)).andExpect(status().isBadRequest());
        assertEquals(0, labels.count());
    }
}
