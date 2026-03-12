package com.libtrack.repository;

import com.libtrack.model.Booking;
import com.libtrack.model.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByBookingId(String bookingId);

    List<Booking> findByStudentIdOrderByDateDesc(String studentId);

    List<Booking> findByDateOrderByStartTimeAsc(LocalDate date);

    /**
     * Check for overlapping bookings on a seat for no-overbooking enforcement.
     * Returns any active/upcoming booking that overlaps with the requested slot.
     */
    @Query("""
        SELECT b FROM Booking b
        WHERE b.seat = :seat
          AND b.date = :date
          AND b.status IN ('UPCOMING', 'ACTIVE')
          AND b.startTime < :endTime
          AND b.endTime > :startTime
    """)
    List<Booking> findOverlapping(
        @Param("seat")      Seat seat,
        @Param("date")      LocalDate date,
        @Param("startTime") LocalTime startTime,
        @Param("endTime")   LocalTime endTime
    );

    /**
     * Count occupied seats in a given slot (for time-slot availability view).
     */
    @Query("""
        SELECT COUNT(DISTINCT b.seat.id) FROM Booking b
        WHERE b.date = :date
          AND b.status IN ('UPCOMING', 'ACTIVE')
          AND b.startTime < :endTime
          AND b.endTime > :startTime
    """)
    long countOccupiedInSlot(
        @Param("date")      LocalDate date,
        @Param("startTime") LocalTime startTime,
        @Param("endTime")   LocalTime endTime
    );

    List<Booking> findByStatus(Booking.BookingStatus status);
}
