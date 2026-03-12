package com.libtrack.controller;

import com.libtrack.model.GroupRoom;
import com.libtrack.model.Seat;
import com.libtrack.repository.BookingRepository;
import com.libtrack.repository.GroupRoomRepository;
import com.libtrack.repository.SeatRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RoomController {

    private final GroupRoomRepository roomRepo;
    private final BookingService      bookingService;
    private final SeatRepository      seatRepo;
    private final BookingRepository   bookingRepo;

    // ── GROUP ROOMS ───────────────────────────────

    /** GET /api/rooms */
    @GetMapping("/rooms")
    public List<GroupRoom> getRooms(@RequestParam(required = false) String status) {
        if (status != null) return roomRepo.findByStatus(GroupRoom.RoomStatus.valueOf(status.toUpperCase()));
        return roomRepo.findAll();
    }

    /** POST /api/room-bookings */
    @PostMapping("/room-bookings")
    public ResponseEntity<Map<String, Object>> bookRoom(@Valid @RequestBody RoomBookingRequest req) {
        LocalTime startTime = LocalTime.parse(req.getStartTime());

        BookingService.BookingResult result = bookingService.bookRoom(
            req.getStudentName(), req.getStudentId(),
            req.getRoomId(), req.getDate(),
            startTime, req.getNumberOfPeople(), req.getDurationHours()); // ✅ pass durationHours

        if (result.success()) {
            return ResponseEntity.ok(Map.of(
                "bookingId",   result.bookingId(),
                "roomNumber",  result.seatNumber(),
                "status",      "CONFIRMED"
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", result.message()));
        }
    }

    // ── STATS  (GET /api/stats) ────────────────────

    @GetMapping("/stats")
    public Map<String, Long> getStats() {
        long totalSeats     = seatRepo.count();
        long availableSeats = seatRepo.countByStatus(Seat.SeatStatus.AVAILABLE);
        long occupiedSeats  = seatRepo.countByStatus(Seat.SeatStatus.OCCUPIED);
        long totalRooms     = roomRepo.count();
        long availableRooms = roomRepo.countByStatus(GroupRoom.RoomStatus.AVAILABLE);

        return Map.of(
            "totalSeats",     totalSeats,
            "availableSeats", availableSeats,
            "occupiedSeats",  occupiedSeats,
            "totalRooms",     totalRooms,
            "availableRooms", availableRooms
        );
    }

    // ── TIME SLOTS  (GET /api/slots?date=2025-04-10) ──

    @GetMapping("/slots")
    public List<Map<String, Object>> getSlots(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate queryDate = date != null ? date : LocalDate.now();
        long totalSeats = seatRepo.count();

        int[] hours = {9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19};
        List<Map<String, Object>> slots = new ArrayList<>();

        for (int h : hours) {
            LocalTime start = LocalTime.of(h, 0);
            LocalTime end   = LocalTime.of(h + 1, 0);
            long occupied   = bookingRepo.countOccupiedInSlot(queryDate, start, end);
            long available  = totalSeats - occupied;

            slots.add(Map.of(
                "id",             h,
                "startTime",      String.format("%02d:00", h),
                "endTime",        String.format("%02d:00", h + 1),
                "totalSeats",     totalSeats,
                "occupiedSeats",  occupied,
                "availableSeats", available
            ));
        }
        return slots;
    }

    // ── Room Booking Request DTO ──────────────────

    @Data
    public static class RoomBookingRequest {
        @NotBlank private String studentName;
        @NotBlank private String studentId;
        @NotNull  private Long roomId;
        @NotNull  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) private LocalDate date;
        @NotBlank private String startTime;
        @NotNull  private int numberOfPeople;
        @NotNull  private int durationHours;   // ✅ added — was hardcoded to 1 before
    }
}
