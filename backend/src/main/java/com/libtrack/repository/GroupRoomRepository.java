package com.libtrack.repository;

import com.libtrack.model.GroupRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupRoomRepository extends JpaRepository<GroupRoom, Long> {
    List<GroupRoom> findByStatus(GroupRoom.RoomStatus status);
    long countByStatus(GroupRoom.RoomStatus status);
}
