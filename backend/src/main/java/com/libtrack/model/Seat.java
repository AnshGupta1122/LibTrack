package com.libtrack.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "seats")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String seatNumber;  // e.g. "A-01"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SeatType type;      // QUIET, COMPUTER, WINDOW

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SeatStatus status;  // AVAILABLE, OCCUPIED, MAINTENANCE

    @Column(nullable = false)
    private String zone;        // A, B, C, D

    @Column(nullable = false)
    private int floor;

    public enum SeatType   { QUIET, COMPUTER, WINDOW }
    public enum SeatStatus { AVAILABLE, OCCUPIED, MAINTENANCE }
}
