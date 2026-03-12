package com.libtrack.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "room_bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String bookingId;

    @Column(nullable = false)
    private String studentName;

    @Column(nullable = false)
    private String studentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private GroupRoom room;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Column(nullable = false)
    private int numberOfPeople;

    @Column(nullable = false)
    private int durationHours;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomBookingStatus status;

    public enum RoomBookingStatus { UPCOMING, ACTIVE, DONE, CANCELLED }
}
