package com.libtrack.repository;

import com.libtrack.model.GroupRoom;
import com.libtrack.model.RoomBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomBookingRepository extends JpaRepository<RoomBooking, Long> {

    Optional<RoomBooking> findByBookingId(String bookingId);

    List<RoomBooking> findByStudentIdOrderByDateDesc(String studentId);

    /** Overlap check — no double-booking of rooms */
    @Query("""
        SELECT rb FROM RoomBooking rb
        WHERE rb.room = :room
          AND rb.date = :date
          AND rb.status IN ('UPCOMING', 'ACTIVE')
          AND rb.startTime < :endTime
          AND rb.endTime > :startTime
    """)
    List<RoomBooking> findOverlapping(
        @Param("room")      GroupRoom room,
        @Param("date")      LocalDate date,
        @Param("startTime") LocalTime startTime,
        @Param("endTime")   LocalTime endTime
    );
}
