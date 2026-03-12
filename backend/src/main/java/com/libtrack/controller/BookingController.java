package com.libtrack.controller;

import com.libtrack.model.Seat;
import com.libtrack.service.BookingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /** POST /api/bookings — book a seat */
    @PostMapping
    public ResponseEntity<Map<String, Object>> bookSeat(@Valid @RequestBody BookSeatRequest req) {
        Seat.SeatType type = Seat.SeatType.valueOf(req.getSeatType().toUpperCase());

        LocalTime startTime = LocalTime.parse(req.getStartTime());

        BookingService.BookingResult result = bookingService.bookSeat(
            req.getStudentName(), req.getStudentId(),
            req.getSeatId(), type,
            req.getDate(), startTime, req.getDurationHours());

        if (result.success()) {
            return ResponseEntity.ok(Map.of(
                "bookingId",   result.bookingId(),
                "seatNumber",  result.seatNumber(),
                "seatType",    result.type(),
                "status",      "CONFIRMED"
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", result.message()));
        }
    }

    /** GET /api/bookings?studentId=STU001 */
    @GetMapping
    public List<Map<String, Object>> getBookings(@RequestParam String studentId) {
        return bookingService.getBookingsByStudent(studentId);
    }

    /** DELETE /api/bookings/{bookingId} — cancel */
    @DeleteMapping("/{bookingId}")
    public ResponseEntity<Map<String, String>> cancel(@PathVariable String bookingId) {
        String msg = bookingService.cancelBooking(bookingId);
        return ResponseEntity.ok(Map.of("message", msg));
    }

    // ── Request DTO ──
    @Data
    public static class BookSeatRequest {
        @NotBlank private String studentName;
        @NotBlank private String studentId;
        @NotNull  private String seatType;      // QUIET | COMPUTER | WINDOW
        private   Long seatId;                  // nullable = auto-assign
        @NotNull  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                  private LocalDate date;
        @NotBlank private String startTime;     // "09:00"
        @NotNull  private int durationHours;    // 1, 2, or 4
    }
}
