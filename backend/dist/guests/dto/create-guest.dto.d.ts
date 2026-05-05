export declare enum GuestStatus {
    ACTIVE = "ACTIVE",
    ARRIVING = "ARRIVING",
    CHECKED_IN = "CHECKED_IN",
    IN_HOUSE = "IN_HOUSE",
    CHECKED_OUT = "CHECKED_OUT",
    INACTIVE = "INACTIVE",
    NO_STAY = "NO_STAY"
}
export declare class CreateGuestDto {
    phone: string;
    name: string;
    email?: string;
    roomNumber?: string;
    checkInDate?: string;
    checkOutDate?: string;
    language?: string;
    status?: GuestStatus;
    optIn?: boolean;
    notes?: string;
    externalId?: string;
}
