import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";

const MAX_LAST_VIEWED = 10;

// Track a product view — LRU insert with cap at 10
const trackView = async (req, res) => {
    try {
        const { userId, productId } = req.body;

        if (!productId) {
            return res.json({ success: false, message: "Product ID is required" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Remove the product if it already exists in lastViewed (we'll re-add it at the front)
        user.lastViewed = user.lastViewed.filter(
            (entry) => entry.productId.toString() !== productId
        );

        // Add to the front (most recently viewed)
        user.lastViewed.unshift({ productId, viewedAt: new Date() });

        // Cap at MAX_LAST_VIEWED — evict the least recently viewed
        if (user.lastViewed.length > MAX_LAST_VIEWED) {
            user.lastViewed = user.lastViewed.slice(0, MAX_LAST_VIEWED);
        }

        await user.save();

        res.json({ success: true, message: "Product view tracked" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get recommendations — lastViewed products padded with similar-category products up to 10
const getRecommendations = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await userModel.findById(userId).populate("lastViewed.productId");
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Filter out entries where the product has been deleted
        const validEntries = user.lastViewed.filter((entry) => entry.productId !== null);

        // Extract the actual product documents
        let recommendations = validEntries.map((entry) => entry.productId);
        const viewedIds = recommendations.map((p) => p._id.toString());

        // If fewer than 10, pad with similar-category products
        if (recommendations.length < MAX_LAST_VIEWED) {
            const categories = [...new Set(recommendations.map((p) => p.category))];
            const needed = MAX_LAST_VIEWED - recommendations.length;

            if (categories.length > 0) {
                const extraProducts = await productModel.find({
                    category: { $in: categories },
                    _id: { $nin: viewedIds },
                }).limit(needed);

                recommendations = [...recommendations, ...extraProducts];
            }

            // If still fewer than 10 (e.g. not enough products in those categories),
            // fill with any other products
            if (recommendations.length < MAX_LAST_VIEWED) {
                const allIds = recommendations.map((p) => p._id.toString());
                const remaining = MAX_LAST_VIEWED - recommendations.length;
                const moreProducts = await productModel.find({
                    _id: { $nin: allIds },
                }).limit(remaining);

                recommendations = [...recommendations, ...moreProducts];
            }
        }

        res.json({ success: true, recommendations });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export { trackView, getRecommendations };
