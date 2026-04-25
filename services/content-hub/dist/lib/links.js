import { env } from "../config/env.js";
export function getFaqLinks() {
    return [
        { title: "How to Apply for Scholarships", url: `${env.SITE_URL}/faq/how-to-apply-for-scholarships` },
        { title: "Scholarship Deadlines Explained", url: `${env.SITE_URL}/faq/scholarship-deadlines-explained` },
        { title: "Can You Combine Multiple Scholarships", url: `${env.SITE_URL}/faq/can-you-combine-multiple-scholarships` }
    ];
}
