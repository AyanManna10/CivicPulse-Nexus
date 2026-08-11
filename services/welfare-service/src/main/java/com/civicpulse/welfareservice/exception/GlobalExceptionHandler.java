package com.civicpulse.welfareservice.exception;

// ── Put each class in its own file in production ──────────────────────────────
// Grouped here for readability. Split into individual files when you copy over.

// Thrown when a DB record is not found (→ 404)
class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) { super(message); }
    public ResourceNotFoundException(String entity, Long id) {
        super(entity + " not found with id: " + id);
    }
}

// Thrown on duplicate enrollment, duplicate email, etc. (→ 409)
class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) { super(message); }
}

// Thrown when business rules are violated — e.g. approving an already-approved
// application, disbursing a PAID distribution, etc. (→ 422)
class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) { super(message); }
}

// Thrown when a user tries to access a resource they don't own (→ 403)
class UnauthorizedAccessException extends RuntimeException {
    public UnauthorizedAccessException(String message) { super(message); }
}

// Thrown when an uploaded file type is not allowed (→ 415)
class InvalidFileTypeException extends RuntimeException {
    public InvalidFileTypeException(String message) { super(message); }
}
