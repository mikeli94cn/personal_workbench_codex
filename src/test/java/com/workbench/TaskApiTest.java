package com.workbench;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:tests;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class TaskApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired TaskRepository tasks;
    @BeforeEach void reset() { tasks.deleteAll(); }

    @Test void taskLifecycle() throws Exception {
        String input = """
            {"title":"  Plan week  ","notes":"Three goals","dueDate":"2026-11-02","priority":"HIGH","completed":false}
            """;
        String response = mvc.perform(post("/api/tasks").contentType("application/json").content(input))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.title").value("Plan week"))
            .andReturn().getResponse().getContentAsString();
        long id = json.readTree(response).get("id").asLong();
        mvc.perform(get("/api/tasks")).andExpect(jsonPath("$[0].id").value(id));
        mvc.perform(put("/api/tasks/" + id).contentType("application/json").content(input.replace("false", "true")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(true));
        mvc.perform(delete("/api/tasks/" + id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/tasks")).andExpect(content().json("[]"));
        mvc.perform(put("/api/tasks/" + id).contentType("application/json").content(input)).andExpect(status().isNotFound());
    }

    @Test void labelsPersistNormalizeAndCanBeRemoved() throws Exception {
        var input = json.createObjectNode().put("title", "Sport for 30 minutes")
            .put("notes", "After work").put("priority", "MEDIUM").put("completed", false);
        input.putArray("labels").add(" Self-Improvement ").add("health").add("self-improvement");
        String response = mvc.perform(post("/api/tasks").contentType("application/json").content(input.toString()))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.labels.length()").value(2)).andReturn().getResponse().getContentAsString();
        long id = json.readTree(response).get("id").asLong();
        mvc.perform(get("/api/tasks"))
            .andExpect(jsonPath("$[0].labels", org.hamcrest.Matchers.containsInAnyOrder("self-improvement", "health")));
        // Older clients omitting labels must not erase them when completing a task.
        input.remove("labels"); input.put("completed", true);
        mvc.perform(put("/api/tasks/" + id).contentType("application/json").content(input.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.labels.length()").value(2));
        input.putArray("labels");
        mvc.perform(put("/api/tasks/" + id).contentType("application/json").content(input.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.labels.length()").value(0));
        input.putArray("labels").add(" ");
        mvc.perform(put("/api/tasks/" + id).contentType("application/json").content(input.toString()))
            .andExpect(status().isBadRequest());
        input.putArray("labels").add("x".repeat(41));
        mvc.perform(put("/api/tasks/" + id).contentType("application/json").content(input.toString()))
            .andExpect(status().isBadRequest());
        var many = input.putArray("labels");
        for (int i = 0; i < 11; i++) many.add("label-" + i);
        mvc.perform(put("/api/tasks/" + id).contentType("application/json").content(input.toString()))
            .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/tasks/" + id)).andExpect(status().isNoContent());
    }

    @Test void rejectsInvalidInput() throws Exception {
        for (String input : new String[]{
            "{\"title\":\"   \",\"notes\":\"\",\"priority\":\"LOW\",\"completed\":false}",
            "{\"title\":\"Valid\",\"notes\":\"\",\"priority\":\"INVALID\",\"completed\":false}",
            "{\"title\":\"Valid\",\"notes\":\"\",\"priority\":\"LOW\"}"
        }) mvc.perform(post("/api/tasks").contentType("application/json").content(input)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/tasks")).andExpect(content().json("[]"));
    }
}
