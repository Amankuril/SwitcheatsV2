import { sendResponse } from '../../../../utils/response.js';
import { listUserCartsForAdmin } from '../../user/services/userCart.service.js';

export const listUserCartsAdminController = async (req, res, next) => {
    try {
        const result = await listUserCartsForAdmin(req.query || {});
        return sendResponse(res, 200, 'User carts retrieved successfully', result);
    } catch (error) {
        next(error);
    }
};
