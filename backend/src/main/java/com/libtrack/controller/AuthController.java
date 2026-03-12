package com.libtrack.controller;

import com.libtrack.model.Student;
import com.libtrack.repository.StudentRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final StudentRepository studentRepo;
    private final PasswordEncoder   passwordEncoder;

    // ── REGISTER ──────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest req) {

        if (studentRepo.existsByStudentId(req.getStudentId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Student ID already registered."));
        }
        if (studentRepo.existsByEmail(req.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already registered."));
        }

        Student student = Student.builder()
            .studentId(req.getStudentId())
            .name(req.getName())
            .email(req.getEmail())
            .password(passwordEncoder.encode(req.getPassword()))  // ✅ BCrypt hashed
            .phone(req.getPhone())
            .course(req.getCourse())
            .build();

        studentRepo.save(student);

        return ResponseEntity.ok(Map.of(
            "success",   true,
            "studentId", student.getStudentId(),
            "name",      student.getName(),
            "message",   "Registered successfully!"
        ));
    }

    // ── LOGIN ─────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest req) {

        Optional<Student> studentOpt = studentRepo.findByStudentId(req.getStudentId());

        if (studentOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Student ID not found."));
        }

        Student student = studentOpt.get();

        if (!passwordEncoder.matches(req.getPassword(), student.getPassword())) {  // ✅ BCrypt match
            return ResponseEntity.badRequest().body(Map.of("message", "Incorrect password."));
        }

        return ResponseEntity.ok(Map.of(
            "success",   true,
            "studentId", student.getStudentId(),
            "name",      student.getName(),
            "email",     student.getEmail(),
            "course",    student.getCourse(),
            "message",   "Login successful!"
        ));
    }

    // ── DTOs ──────────────────────────────────────
    @Data
    public static class RegisterRequest {
        @NotBlank private String studentId;
        @NotBlank private String name;
        @NotBlank private String email;
        @NotBlank private String password;
        @NotBlank private String phone;
        @NotBlank private String course;
    }

    @Data
    public static class LoginRequest {
        @NotBlank private String studentId;
        @NotBlank private String password;
    }
}
