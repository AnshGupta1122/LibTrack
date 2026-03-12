package com.libtrack.repository;

import com.libtrack.model.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByStatus(Seat.SeatStatus status);

    List<Seat> findByType(Seat.SeatType type);

    List<Seat> findByTypeAndStatus(Seat.SeatType type, Seat.SeatStatus status);

    List<Seat> findByZone(String zone);

    long countByStatus(Seat.SeatStatus status);

    @Query("SELECT s FROM Seat s WHERE s.status = 'AVAILABLE' ORDER BY s.seatNumber")
    List<Seat> findAllAvailableOrdered();
}
