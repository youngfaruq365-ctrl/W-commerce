const prisma = require('../utils/prismaClient');
const rateLimitService = require('./rateLimitService');
const logger = require('../utils/logger');
const messagingService = require('./messagingService');
const notificationService = require('./notificationService');

class EngagementService {

  async _ensureFeedPostExists(postId) {
    let post = await prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post) {
      const product = await prisma.product.findUnique({
        where: { id: postId },
        include: { store: true }
      });
      if (product) {
        try {
          post = await prisma.feedPost.create({
            data: {
              id: product.id,
              sellerId: product.store.sellerId,
              productId: product.id,
              caption: product.title
            }
          });
        } catch (e) {
          post = await prisma.feedPost.findUnique({ where: { id: postId } });
        }
      }
    }
    return post;
  }

  async like(postId, userId) {
    if (!(await rateLimitService.checkLimit(userId, 'LIKE'))) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    try {
      await this._ensureFeedPostExists(postId);
      const existingLike = await prisma.like.findUnique({
        where: { userId_postId: { userId, postId } }
      });

      if (existingLike) {
        return { liked: true };
      }

      await prisma.like.create({
        data: { userId, postId }
      });

      return { liked: true };
    } catch (error) {
      logger.error(`Error in like: ${error.message}`);
      throw error;
    }
  }

  async unlike(postId, userId) {
    try {
      await prisma.like.deleteMany({
        where: { userId, postId }
      });
      return { liked: false };
    } catch (error) {
      logger.error(`Error in unlike: ${error.message}`);
      throw error;
    }
  }

  async followSeller(sellerId, buyerId) {
    if (sellerId === buyerId) {
      throw new Error('CANNOT_FOLLOW_SELF');
    }

    if (!(await rateLimitService.checkLimit(buyerId, 'FOLLOW'))) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    try {
      const existingFollow = await prisma.sellerFollow.findUnique({
        where: { buyerId_sellerId: { buyerId, sellerId } }
      });

      if (existingFollow) {
        return { following: true };
      }

      await prisma.sellerFollow.create({
        data: { buyerId, sellerId }
      });

      return { following: true };
    } catch (error) {
      logger.error(`Error in followSeller: ${error.message}`);
      throw error;
    }
  }

  async unfollowSeller(sellerId, buyerId) {
    try {
      await prisma.sellerFollow.deleteMany({
        where: { buyerId, sellerId }
      });
      return { following: false };
    } catch (error) {
      logger.error(`Error in unfollowSeller: ${error.message}`);
      throw error;
    }
  }

  async getFollowStatus(sellerId, buyerId) {
    try {
      const existingFollow = await prisma.sellerFollow.findUnique({
        where: { buyerId_sellerId: { buyerId, sellerId } }
      });
      return { following: !!existingFollow };
    } catch (error) {
      logger.error(`Error in getFollowStatus: ${error.message}`);
      throw error;
    }
  }

  async recordView(postId, userId, sessionId, target = 'post') {
    return this._recordEvent(postId, userId, sessionId, 'VIEW', target);
  }

  async recordClick(postId, userId, sessionId, target) {
    return this._recordEvent(postId, userId, sessionId, 'CLICK', target);
  }

  async _recordEvent(postId, userId, sessionId, action, target) {
    const rateLimitKey = userId || sessionId;
    if (!(await rateLimitService.checkLimit(rateLimitKey, action))) {
      return { success: false, reason: 'RATE_LIMIT_EXCEEDED' };
    }

    try {
      // Deduplication: prevent the same user/session from registering the same event on the same post within 10 seconds
      const recentEvent = await prisma.engagementEvent.findFirst({
        where: {
          postId,
          action,
          target,
          OR: [{ userId }, { sessionId }],
          createdAt: {
            gte: new Date(Date.now() - 10000)
          }
        }
      });

      if (recentEvent) {
        return { success: false, reason: 'DUPLICATE_EVENT' };
      }

      await prisma.engagementEvent.create({
        data: {
          postId,
          userId,
          sessionId,
          action,
          target
        }
      });
      return { success: true };
    } catch (error) {
      logger.error(`Error in _recordEvent: ${error.message}`);
      throw error;
    }
  }

  async createComment(postId, userId, content, parentId = null) {
    if (!(await rateLimitService.checkLimit(userId, 'COMMENT'))) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    try {
      const post = await this._ensureFeedPostExists(postId);

      if (!post) {
        throw new Error('POST_NOT_FOUND');
      }

      const sellerId = post.sellerId;

      const comment = await prisma.feedComment.create({
        data: {
          content,
          userId,
          postId,
          sellerId,
          parentId
        },
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true } }
        }
      });

      // Notifications and Messages
      if (userId !== sellerId) {
        const commenter = await prisma.user.findUnique({ where: { id: userId } });
        const messageText = `New comment on your feed post:\n\n"${content}"\n\n- ${commenter.fullName}`;
        
        try {
          const message = await messagingService.sendMessage({
            senderId: userId,
            receiverId: sellerId,
            content: messageText,
            productId: post.productId,
            isSystemMessage: true
          });

          if (message && message.id) {
            await prisma.feedComment.update({
              where: { id: comment.id },
              data: { messageId: message.id }
            });
          }

          await notificationService.createNotification({
            userId: sellerId,
            title: 'New Feed Comment',
            body: `${commenter.fullName} commented on your post: "${content.substring(0, 50)}..."`,
            type: 'INFO',
            linkUrl: `/post/${postId}`
          });
        } catch (msgErr) {
          logger.error('Failed to send DM/Notification for comment', msgErr);
        }
      }

      return comment;
    } catch (error) {
      logger.error(`Error in createComment: ${error.message}`);
      throw error;
    }
  }

  async deleteComment(commentId, userId, userRole) {
    try {
      const comment = await prisma.feedComment.findUnique({ where: { id: commentId } });
      if (!comment) throw new Error('COMMENT_NOT_FOUND');

      if (comment.userId !== userId && userRole !== 'ADMIN') {
        throw new Error('UNAUTHORIZED');
      }

      await prisma.feedComment.delete({ where: { id: commentId } });
      return { success: true };
    } catch (error) {
      logger.error(`Error in deleteComment: ${error.message}`);
      throw error;
    }
  }

  async getStats(postId, userId = null) {
    try {
      const [likesCount, commentsCount, viewsCount, clicksCount] = await Promise.all([
        prisma.like.count({ where: { postId } }),
        prisma.feedComment.count({ where: { postId } }),
        prisma.engagementEvent.count({ where: { postId, action: 'VIEW' } }),
        prisma.engagementEvent.count({ where: { postId, action: 'CLICK' } })
      ]);

      let liked = false;
      if (userId) {
        const like = await prisma.like.findUnique({
          where: { userId_postId: { userId, postId } }
        });
        liked = !!like;
      }

      return {
        liked,
        likesCount,
        commentsCount,
        viewsCount,
        clicksCount
      };
    } catch (error) {
      logger.error(`Error in getStats: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new EngagementService();
