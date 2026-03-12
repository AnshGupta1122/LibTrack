package com.libtrack.controller;

import com.libtrack.model.Seat;
import com.libtrack.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatRepository seatRepo;

    /** GET /api/seats — all seats, optionally filtered */
    @GetMapping
    public List<Seat> getSeats(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {

        if (type != null && status != null) {
            return seatRepo.findByTypeAndStatus(
                Seat.SeatType.valueOf(type.toUpperCase()),
                Seat.SeatStatus.valueOf(status.toUpperCase()));
        }
        if (type != null) {
            return seatRepo.findByType(Seat.SeatType.valueOf(type.toUpperCase()));
        }
        if (status != null) {
            return seatRepo.findByStatus(Seat.SeatStatus.valueOf(status.toUpperCase()));
        }
        return seatRepo.findAll();
    }

    /** GET /api/seats/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<Seat> getSeat(@PathVariable Long id) {
        return seatRepo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /** GET /api/seats/stats */
    @GetMapping("/stats")
    public Map<String, Long> getStats() {
        long total     = seatRepo.count();
        long available = seatRepo.countByStatus(Seat.SeatStatus.AVAILABLE);
        long occupied  = seatRepo.countByStatus(Seat.SeatStatus.OCCUPIED);
        return Map.of("total", total, "available", available, "occupied", occupied);
    }
}
