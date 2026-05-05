export declare enum TemplateCategory {
    MARKETING = "MARKETING",
    UTILITY = "UTILITY",
    AUTHENTICATION = "AUTHENTICATION"
}
export declare enum HeaderType {
    NONE = "NONE",
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    DOCUMENT = "DOCUMENT"
}
export declare class CreateTemplateDto {
    name: string;
    category: TemplateCategory;
    language: string;
    headerText?: string;
    headerType?: HeaderType;
    bodyText?: string;
    footerText?: string;
    components?: any[];
    buttons?: any[];
    submitToMeta?: boolean;
}
