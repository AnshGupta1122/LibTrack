package com.libtrack.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "group_rooms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String roomNumber;   // e.g. "G-01"

    @Column(nullable = false)
    private int capacity;        // max people

    @Column(nullable = false)
    private String floor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomStatus status;

    @ElementCollection
    @CollectionTable(name = "room_amenities", joinColumns = @JoinColumn(name = "room_id"))
    @Column(name = "amenity")
    private List<String> amenities;

    public enum RoomStatus { AVAILABLE, OCCUPIED, MAINTENANCE }
}
