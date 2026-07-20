package com.civicpulse.certificateservice.entity;

/**
 * Unified type for both certificates and permit/license applications.
 *
 * Certificates (proof documents):
 *   BIRTH, DEATH, INCOME, RESIDENCE, MARRIAGE
 *
 * Permits & Licenses (authorisation to operate / construct / connect):
 *   TRADE_LICENSE    – Commercial trading activity
 *   SHOP_LICENSE     – Shop & Establishment registration
 *   BUILDING_PERMIT  – Construction / renovation approval
 *   WATER_CONNECTION – New domestic/commercial water connection
 */
public enum CertificateType {

    // ── Certificates ────────────────────────────────────────────────────────
    BIRTH,
    DEATH,
    INCOME,
    RESIDENCE,
    MARRIAGE,

    // ── Permits & Licences ──────────────────────────────────────────────────
    TRADE_LICENSE,
    SHOP_LICENSE,
    BUILDING_PERMIT,
    WATER_CONNECTION
}
