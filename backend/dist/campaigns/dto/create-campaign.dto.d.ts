export declare enum AudienceType {
    ALL = "ALL",
    ARRIVING = "ARRIVING",
    CHECKED_IN = "CHECKED_IN",
    IN_HOUSE = "IN_HOUSE",
    CHECKED_OUT = "CHECKED_OUT",
    TAG = "TAG",
    CUSTOM = "CUSTOM",
    CSV = "CSV"
}
export declare class CreateCampaignDto {
    name: string;
    templateId: string;
    audienceType: AudienceType;
    audienceFilter?: Record<string, any>;
    scheduledAt?: string;
    variableValues?: Record<string, string>;
}
