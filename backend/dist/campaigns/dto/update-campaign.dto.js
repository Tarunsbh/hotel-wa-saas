"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCampaignDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_campaign_dto_1 = require("./create-campaign.dto");
class UpdateCampaignDto extends (0, swagger_1.PartialType)(create_campaign_dto_1.CreateCampaignDto) {
}
exports.UpdateCampaignDto = UpdateCampaignDto;
//# sourceMappingURL=update-campaign.dto.js.map