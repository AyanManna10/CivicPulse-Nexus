package com.civicpulse.userservice.service.impl;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.civicpulse.userservice.dto.UserRequest;
import com.civicpulse.userservice.dto.UserResponse;
import com.civicpulse.userservice.entity.User;
import com.civicpulse.userservice.exception.UserNotFoundException;
import com.civicpulse.userservice.repository.UserRepository;
import com.civicpulse.userservice.service.UserService;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.List;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {

    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
}

    @Override
    public UserResponse createUser(UserRequest request) {

    User user = new User();

    user.setFullName(request.getFullName());
    user.setEmail(request.getEmail());
    user.setPassword(passwordEncoder.encode(request.getPassword()));
    user.setPhone(request.getPhone());
    user.setRole(request.getRole());
    user.setDepartment(request.getDepartment());

    User savedUser = userRepository.save(user);

    return mapToResponse(savedUser);
}

    @Override
public List<UserResponse> getAllUsers() {

    return userRepository.findAll()
            .stream()
            .map(this::mapToResponse)
            .toList();

}

    @Override
public UserResponse getUserById(Long id) {

    User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));

    return mapToResponse(user);

}

    @Override
public UserResponse updateUser(Long id, UserRequest request) {

    User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));

    user.setFullName(request.getFullName());
    user.setEmail(request.getEmail());
    user.setPassword(passwordEncoder.encode(request.getPassword()));
    user.setPhone(request.getPhone());
    user.setRole(request.getRole());
    user.setDepartment(request.getDepartment());

    User updatedUser = userRepository.save(user);

    return mapToResponse(updatedUser);
}

    @Override
    @ResponseStatus(HttpStatus.NOT_FOUND)
public void deleteUser(Long id) {

    userRepository.deleteById(id);

}


private UserResponse mapToResponse(User user) {
    UserResponse response = new UserResponse();

    response.setId(user.getId());
    response.setFullName(user.getFullName());
    response.setEmail(user.getEmail());
    response.setPhone(user.getPhone());
    response.setRole(user.getRole());
    response.setDepartment(user.getDepartment());
    response.setActive(user.getActive());
    response.setCreatedAt(user.getCreatedAt());
    response.setUpdatedAt(user.getUpdatedAt());

    return response;
}
}