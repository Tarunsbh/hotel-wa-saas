"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateGuestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_guest_dto_1 = require("./create-guest.dto");
class UpdateGuestDto extends (0, swagger_1.PartialType)(create_guest_dto_1.CreateGuestDto) {
}
exports.UpdateGuestDto = UpdateGuestDto;
//# sourceMappingURL=update-guest.dto.js.map