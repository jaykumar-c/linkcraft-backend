import { Repository, In } from "typeorm";
import { Link } from "../entities/link.entity";

/**
 * Reorder links in bulk.
 */
export const reorderLinks = async (
  linkRepository: Repository<Link>,
  userId: string,
  linkOrders: { id: string; orderIndex: number }[],
): Promise<void> => {
  if (linkOrders.length === 0) return;

  const linkIds = linkOrders.map((item) => item.id);
  const timestamp = Math.floor(Date.now() / 1000);

  for (const item of linkOrders) {
    await linkRepository.update(
      { id: item.id, userId, isDeleted: false },
      { orderIndex: item.orderIndex, updatedAt: timestamp },
    );
  }
};
