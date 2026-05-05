export declare enum TriggerType {
    SCHEDULED = "SCHEDULED",
    CHECK_IN = "CHECK_IN",
    CHECK_OUT = "CHECK_OUT",
    KEYWORD = "KEYWORD",
    INACTIVITY = "INACTIVITY",
    BEFORE_ARRIVAL = "BEFORE_ARRIVAL",
    AFTER_CHECKIN = "AFTER_CHECKIN",
    DURING_STAY = "DURING_STAY",
    BEFORE_CHECKOUT = "BEFORE_CHECKOUT",
    AFTER_CHECKOUT = "AFTER_CHECKOUT",
    CUSTOM_DATE = "CUSTOM_DATE"
}
export declare enum RuleAudienceType {
    ALL = "ALL",
    ARRIVING = "ARRIVING",
    CHECKED_IN = "CHECKED_IN",
    IN_HOUSE = "IN_HOUSE",
    CHECKED_OUT = "CHECKED_OUT",
    TAG = "TAG",
    CUSTOM = "CUSTOM",
    CSV = "CSV"
}
export declare class CreateAutomationRuleDto {
    name: string;
    triggerType: TriggerType;
    triggerConfig?: Record<string, any>;
    templateId: string;
    audienceType: RuleAudienceType;
    audienceFilter?: Record<string, any>;
    variableValues?: Record<string, string>;
    isActive?: boolean;
}
