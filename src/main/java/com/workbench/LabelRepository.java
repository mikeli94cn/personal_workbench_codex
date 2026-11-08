package com.workbench;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LabelRepository extends JpaRepository<LabelDefinition, Long> {
    Optional<LabelDefinition> findByName(String name);
}
