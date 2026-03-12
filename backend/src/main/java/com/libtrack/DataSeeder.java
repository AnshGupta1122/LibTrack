package com.libtrack;

import com.libtrack.model.GroupRoom;
import com.libtrack.model.Seat;
import com.libtrack.repository.GroupRoomRepository;
import com.libtrack.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Seeds the database with initial seats and group rooms on startup.
 * Remove or adjust for production.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final SeatRepository    seatRepo;
    private final GroupRoomRepository roomRepo;

    @Override
    public void run(String... args) {
        seedSeats();
        seedRooms();
    }

    private void seedSeats() {
        if (seatRepo.count() > 0) return;

        List<Seat> seats = new ArrayList<>();
        // Zone A — Quiet (12 seats)
        for (int i = 1; i <= 12; i++) {
            seats.add(Seat.builder()
                .seatNumber("A-" + String.format("%02d", i))
                .type(Seat.SeatType.QUIET)
                .status(Seat.SeatStatus.AVAILABLE)
                .zone("A").floor(1).build());
        }
        // Zone B — Computer (12 seats)
        for (int i = 1; i <= 12; i++) {
            seats.add(Seat.builder()
                .seatNumber("B-" + String.format("%02d", i))
                .type(Seat.SeatType.COMPUTER)
                .status(Seat.SeatStatus.AVAILABLE)
                .zone("B").floor(1).build());
        }
        // Zone C — Window (12 seats)
        for (int i = 1; i <= 12; i++) {
            seats.add(Seat.builder()
                .seatNumber("C-" + String.format("%02d", i))
                .type(Seat.SeatType.WINDOW)
                .status(Seat.SeatStatus.AVAILABLE)
                .zone("C").floor(2).build());
        }
        // Zone D — Quiet (12 seats)
        for (int i = 1; i <= 12; i++) {
            seats.add(Seat.builder()
                .seatNumber("D-" + String.format("%02d", i))
                .type(Seat.SeatType.QUIET)
                .status(Seat.SeatStatus.AVAILABLE)
                .zone("D").floor(2).build());
        }
        seatRepo.saveAll(seats);
        System.out.println("✅ Seeded " + seats.size() + " seats.");
    }

    private void seedRooms() {
        if (roomRepo.count() > 0) return;

        List<GroupRoom> rooms = List.of(
            GroupRoom.builder().roomNumber("G-01").capacity(6) .floor("1st").status(GroupRoom.RoomStatus.AVAILABLE).amenities(List.of("Whiteboard","TV Screen","AC")).build(),
            GroupRoom.builder().roomNumber("G-02").capacity(8) .floor("1st").status(GroupRoom.RoomStatus.AVAILABLE).amenities(List.of("Whiteboard","AC")).build(),
            GroupRoom.builder().roomNumber("G-03").capacity(4) .floor("2nd").status(GroupRoom.RoomStatus.AVAILABLE).amenities(List.of("Whiteboard")).build(),
            GroupRoom.builder().roomNumber("G-04").capacity(10).floor("2nd").status(GroupRoom.RoomStatus.AVAILABLE).amenities(List.of("Projector","Whiteboard","AC")).build(),
            GroupRoom.builder().roomNumber("G-05").capacity(6) .floor("3rd").status(GroupRoom.RoomStatus.AVAILABLE).amenities(List.of("Whiteboard","TV Screen")).build(),
            GroupRoom.builder().roomNumber("G-06").capacity(8) .floor("3rd").status(GroupRoom.RoomStatus.AVAILABLE).amenities(List.of("AC","Whiteboard")).build()
        );
        roomRepo.saveAll(rooms);
        System.out.println("✅ Seeded " + rooms.size() + " group rooms.");
    }
}
