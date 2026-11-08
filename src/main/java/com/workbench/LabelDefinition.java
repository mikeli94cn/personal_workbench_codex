package com.workbench;

import jakarta.persistence.*;

@Entity
@Table(name = "label_definitions", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class LabelDefinition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false, length = 40)
    public String name;
    @Column(nullable = false, length = 7)
    public String color;
}
