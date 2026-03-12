package com.libtrack.service;

import com.libtrack.model.*;
import com.libtrack.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository     bookingRepo;
    private final SeatRepository        seatRepo;
    private final GroupRoomRepository   roomRepo;
    private final RoomBookingRepository roomBookingRepo;

    // ── Seat Booking ─────────────────────────────────────
    @Transactional
    public BookingResult bookSeat(String studentName, String studentId,
                                  Long seatId, Seat.SeatType seatType,
                                  LocalDate date, LocalTime startTime, int durationHours) {

        // Validate duration
        if (durationHours < 1 || durationHours > 4) {
            return BookingResult.fail("Duration must be 1–4 hours.");
        }
        // Validate date
        if (date.isBefore(LocalDate.now())) {
            return BookingResult.fail("Cannot book in the past.");
        }
        if (date.isAfter(LocalDate.now().plusDays(30))) {
            return BookingResult.fail("Cannot book more than 30 days in advance.");
        }

        LocalTime endTime = startTime.plusHours(durationHours);

        Seat seat;
        if (seatId != null) {
            // User picked a specific seat
            seat = seatRepo.findById(seatId)
                .orElseThrow(() -> new RuntimeException("Seat not found."));
        } else {
            // Auto-assign: find first available seat of requested type
            seat = seatRepo.findByTypeAndStatus(seatType, Seat.SeatStatus.AVAILABLE)
                .stream().findFirst()
                .orElse(null);
            if (seat == null) {
                return BookingResult.fail("No seats of type " + seatType + " available.");
            }
        }

        // ── NO OVERBOOKING CHECK ──
        List<Booking> conflicts = bookingRepo.findOverlapping(seat, date, startTime, endTime);
        if (!conflicts.isEmpty()) {
            return BookingResult.fail("Seat " + seat.getSeatNumber() +
                " is already booked during " + startTime + "–" + endTime + " on " + date + ".");
        }

        // Create booking
        String bookingId = generateBookingId();
        Booking booking  = Booking.builder()
            .bookingId(bookingId)
            .studentName(studentName)
            .studentId(studentId)
            .seat(seat)
            .date(date)
            .startTime(startTime)
            .endTime(endTime)
            .durationHours(durationHours)
            .status(date.equals(LocalDate.now()) ? Booking.BookingStatus.ACTIVE : Booking.BookingStatus.UPCOMING)
            .type(Booking.BookingType.SEAT)
            .build();

        bookingRepo.save(booking);

        // Mark seat occupied if booking is for today
        if (date.equals(LocalDate.now())) {
            seat.setStatus(Seat.SeatStatus.OCCUPIED);
            seatRepo.save(seat);
        }

        return BookingResult.success(bookingId, seat.getSeatNumber(), seat.getType().name());
    }

    // ── Room Booking ─────────────────────────────────────
    @Transactional
    public BookingResult bookRoom(String studentName, String studentId,
                                  Long roomId, LocalDate date,
                                  LocalTime startTime, int numberOfPeople, int durationHours) {

        if (date.isBefore(LocalDate.now())) return BookingResult.fail("Cannot book in the past.");

        // Validate duration (same rule as seat bookings)
        if (durationHours < 1 || durationHours > 4) {
            return BookingResult.fail("Room duration must be 1–4 hours.");
        }

        GroupRoom room = roomRepo.findById(roomId)
            .orElseThrow(() -> new RuntimeException("Room not found."));

        if (numberOfPeople > room.getCapacity()) {
            return BookingResult.fail("Room " + room.getRoomNumber() +
                " fits max " + room.getCapacity() + " people. You requested " + numberOfPeople + ".");
        }

        LocalTime endTime = startTime.plusHours(durationHours);

        // Overlap check
        List<RoomBooking> conflicts = roomBookingRepo.findOverlapping(room, date, startTime, endTime);
        if (!conflicts.isEmpty()) {
            return BookingResult.fail("Room " + room.getRoomNumber() +
                " is already booked at " + startTime + " on " + date + ".");
        }

        String bookingId = generateBookingId("RM");
        RoomBooking rb   = RoomBooking.builder()
            .bookingId(bookingId)
            .studentName(studentName)
            .studentId(studentId)
            .room(room)
            .date(date)
            .startTime(startTime)
            .endTime(endTime)
            .numberOfPeople(numberOfPeople)
            .durationHours(durationHours)
            .status(RoomBooking.RoomBookingStatus.UPCOMING)
            .build();

        roomBookingRepo.save(rb);

        if (date.equals(LocalDate.now())) {
            room.setStatus(GroupRoom.RoomStatus.OCCUPIED);
            roomRepo.save(room);
        }

        return BookingResult.success(bookingId, room.getRoomNumber(), "GROUP_ROOM");
    }

    // ── Cancel Booking ────────────────────────────────────
    @Transactional
    public String cancelBooking(String bookingId) {
        // Try seat booking first
        Optional<Booking> bOpt = bookingRepo.findByBookingId(bookingId);
        if (bOpt.isPresent()) {
            Booking b = bOpt.get();
            if (b.getStatus() == Booking.BookingStatus.DONE) return "Booking already completed.";
            b.setStatus(Booking.BookingStatus.CANCELLED);
            bookingRepo.save(b);
            // Free the seat if today
            if (b.getDate().equals(LocalDate.now())) {
                b.getSeat().setStatus(Seat.SeatStatus.AVAILABLE);
                seatRepo.save(b.getSeat());
            }
            return "Booking " + bookingId + " cancelled.";
        }
        // Try room booking
        Optional<RoomBooking> rbOpt = roomBookingRepo.findByBookingId(bookingId);
        if (rbOpt.isPresent()) {
            RoomBooking rb = rbOpt.get();
            rb.setStatus(RoomBooking.RoomBookingStatus.CANCELLED);
            roomBookingRepo.save(rb);
            return "Room booking " + bookingId + " cancelled.";
        }
        return "Booking not found.";
    }

    // ── Get Bookings by Student ───────────────────────────
    public List<Map<String, Object>> getBookingsByStudent(String studentId) {
        List<Map<String, Object>> result = new ArrayList<>();

        bookingRepo.findByStudentIdOrderByDateDesc(studentId).forEach(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("bookingId",     b.getBookingId());
            m.put("type",          "SEAT");
            m.put("seatNumber",    b.getSeat().getSeatNumber());
            m.put("seatType",      b.getSeat().getType().name());
            m.put("date",          b.getDate().toString());
            m.put("startTime",     b.getStartTime().toString());
            m.put("durationHours", b.getDurationHours());
            m.put("status",        b.getStatus().name());
            result.add(m);
        });

        roomBookingRepo.findByStudentIdOrderByDateDesc(studentId).forEach(rb -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("bookingId",      rb.getBookingId());
            m.put("type",           "GROUP");
            m.put("roomNumber",     rb.getRoom().getRoomNumber());
            m.put("date",           rb.getDate().toString());
            m.put("startTime",      rb.getStartTime().toString());
            m.put("durationHours",  rb.getDurationHours());
            m.put("numberOfPeople", rb.getNumberOfPeople());
            m.put("status",         rb.getStatus().name());
            result.add(m);
        });

        result.sort((a, b) -> ((String) b.get("date")).compareTo((String) a.get("date")));
        return result;
    }

    // ── Helpers ───────────────────────────────────────────
    private String generateBookingId() { return generateBookingId("BK"); }
    private String generateBookingId(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().replace("-","").substring(0,8).toUpperCase();
    }

    // ── Inner Result DTO ──────────────────────────────────
    public record BookingResult(boolean success, String bookingId, String seatNumber, String type, String message) {
        static BookingResult success(String id, String seat, String type) { return new BookingResult(true, id, seat, type, null); }
        static BookingResult fail(String msg)                              { return new BookingResult(false, null, null, null, msg); }
    }
}
