import { Request, Response } from 'express';
import { SiteContent } from '../models/SiteContent';
import { SiteContentHistory } from '../models/SiteContentHistory';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDatabaseStatus } from '../config/database';
import { logger } from '../utils/logger';

// Default authentic content for Lucky Dental Care
export const DEFAULT_SITE_CONTENT: Record<
  string,
  { page: string; section: string; value: string; type: 'text' | 'multiline' | 'image' | 'link'; label: string }
> = {
  // Global / Contact
  'global.clinic_name': { page: 'global', section: 'brand', value: 'Lucky Dental Care', type: 'text', label: 'ক্লিনিকের নাম' },
  'global.tagline': { page: 'global', section: 'brand', value: 'Smile for Life • Estd 1982', type: 'text', label: 'ট্যাগলাইন' },
  'global.phone': { page: 'global', section: 'contact', value: '০১৭১৫-৯১৭৮৩৪', type: 'text', label: 'ফোন নম্বর' },
  'global.phone_raw': { page: 'global', section: 'contact', value: '01715917834', type: 'text', label: 'কল ডায়াল লিঙ্ক' },
  'global.address': { page: 'global', section: 'contact', value: 'কুষ্টিয়া, বাংলাদেশ', type: 'text', label: 'ঠিকানা' },
  'global.doctor_name': { page: 'global', section: 'brand', value: 'ডেন্টিস্ট মোঃ যোসেফ বিশ্বাস (রকি)', type: 'text', label: 'প্রধান ডেন্টিস্ট' },
  'global.facebook_url': { page: 'global', section: 'social', value: 'https://www.facebook.com/luckydentalcare1982/', type: 'link', label: 'ফেসবুক লিঙ্ক' },
  'global.maps_url': {
    page: 'global',
    section: 'contact',
    value: 'https://www.google.com/maps/place/Lucky+Dental+Care/@23.9080413,89.13006,978m/data=!3m1!1e3!4m6!3m5!1s0x39fe97007520661f:0xbec8cc848fb24d5d!8m2!3d23.9080413!4d89.13006!16s%2Fg%2F11wy1mrwj2?entry=ttu',
    type: 'link',
    label: 'গুগল ম্যাপ লিঙ্ক'
  },
  'global.edit_btn_label': { page: 'global', section: 'footer', value: 'সম্পাদনা', type: 'text', label: 'সম্পাদনা বাটন লেবেল' },

  // Home Hero
  'home.hero.badge': { page: 'home', section: 'hero', value: '১৯৮২ সাল থেকে • ৪৪ বছরের গৌরবময় অভিজ্ঞতা', type: 'text', label: 'হিরো ব্যাজ' },
  'home.hero.title': { page: 'home', section: 'hero', value: 'চার দশকের ঐতিহ্যে আপনার সুন্দর হাসির বিশ্বস্ত ঠিকানা', type: 'text', label: 'হিরো শিরোনাম' },
  'home.hero.subtitle': {
    page: 'home',
    section: 'hero',
    value: 'অভিজ্ঞতা, আধুনিক প্রযুক্তি ও আন্তরিক যত্নের সমন্বয়ে Lucky Dental Care ১৯৮২ সাল থেকে কুষ্টিয়াবাসীর হাসির আস্থার প্রতীক হয়ে নিরবচ্ছিন্ন ডেন্টাল সেবা প্রদান করে আসছে।',
    type: 'multiline',
    label: 'হিরো সাবটাইটেল'
  },
  'home.hero.image': { page: 'home', section: 'hero', value: 'lucky_image/image_front.jpg', type: 'image', label: 'হিরো মূল ছবি' },

  // Home CTA Banner
  'home.cta.badge': { page: 'home', section: 'cta', value: 'দ্রুত শিডিউল করুন', type: 'text', label: 'সিটিআই ব্যাজ' },
  'home.cta.title': { page: 'home', section: 'cta', value: 'দাঁতের যে কোনো সমস্যায় আর অপেক্ষা নয়', type: 'text', label: 'সিটিআই শিরোনাম' },
  'home.cta.subtitle': {
    page: 'home',
    section: 'cta',
    value: 'অভিজ্ঞ ডেন্টিস্ট দ্বারা সঠিক রোগ নির্ণয় ও সর্বোচ্চ আন্তর্জাতিক মানসম্মত নিরাপদ চিকিৎসাসেবা গ্রহণ করুন।',
    type: 'multiline',
    label: 'সিটিআই সাবটাইটেল'
  },

  // Home Estimator Section
  'home.estimator.badge': { page: 'home', section: 'estimator', value: 'খরচের স্বচ্ছতা ও পূর্বপরিকল্পনা', type: 'text', label: 'এস্টিমেটর ব্যাজ' },
  'home.estimator.title': { page: 'home', section: 'estimator', value: 'কুষ্টিয়ায় দাঁতের চিকিৎসায় কত খরচ হতে পারে?', type: 'text', label: 'এস্টিমেটর শিরোনাম' },
  'home.estimator.subtitle': { page: 'home', section: 'estimator', value: 'আপনার প্রয়োজনীয় সেবাগুলো নির্বাচন করে একটি আনুমানিক খরচ দেখুন।', type: 'multiline', label: 'এস্টিমেটর সাবটাইটেল' },
  'home.estimator.disclaimer': {
    page: 'home',
    section: 'estimator',
    value: 'এটি শুধুমাত্র প্রাথমিক আনুমানিক হিসাব। রোগীর অবস্থা, চিকিৎসা পরিকল্পনা ও প্রয়োজনীয় উপকরণের ভিত্তিতে প্রকৃত খরচ পরিবর্তিত হতে পারে।',
    type: 'multiline',
    label: 'এস্টিমেটর সতর্কবার্তা'
  },

  // About Page
  'about.story.title': { page: 'about', section: 'story', value: '১৯৮২ সাল থেকে চার দশকের নিরবচ্ছিন্ন সেবা', type: 'text', label: 'আমাদের গল্প শিরোনাম' },
  'about.story.content': {
    page: 'about',
    section: 'story',
    value: 'কুষ্টিয়া শহরের প্রাণকেন্দ্রে প্রতিষ্ঠিত Lucky Dental Care আধুনিক ডেন্টাল চিকিৎসার পথিকৃৎ। চার দশকের অভিজ্ঞতায় হাজারো রোগীর মুখে হাসি ফিরিয়ে দেওয়াই আমাদের সাফল্য।',
    type: 'multiline',
    label: 'আমাদের গল্প বিস্তারিত'
  }
};

let memoryContentCache: Record<string, any> = {};
let memoryHistory: any[] = [];

export const seedDefaultSiteContent = async () => {
  try {
    if (getDatabaseStatus() !== 'connected') return;

    const count = await SiteContent.countDocuments();
    if (count === 0) {
      const items = Object.entries(DEFAULT_SITE_CONTENT).map(([key, data]) => ({
        key,
        page: data.page,
        section: data.section,
        value: data.value,
        type: data.type,
        label: data.label,
        updatedBy: 'system-seed'
      }));
      await SiteContent.insertMany(items);

      // Create initial seed history record
      const initialSnapshot: Record<string, string> = {};
      items.forEach((i) => {
        initialSnapshot[i.key] = i.value;
      });
      await SiteContentHistory.create({
        versionId: `init-${Date.now()}`,
        timestamp: new Date(),
        updatedBy: 'system-seed',
        changes: [{ key: 'all', newValue: 'Initial baseline setup' }],
        snapshot: initialSnapshot
      });

      logger.info(`Seeded ${items.length} initial site content items for Lucky Dental Care`);
    }
  } catch (err) {
    logger.warn('Initial site content seeding deferred', { err });
  }
};

/**
 * Public Endpoint: GET /api/site-content
 */
export const getPublicSiteContent = async (req: Request, res: Response) => {
  try {
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const docs = await SiteContent.find().lean();
      const contentMap: Record<string, any> = {};

      if (docs.length === 0) {
        Object.entries(DEFAULT_SITE_CONTENT).forEach(([k, v]) => {
          contentMap[k] = v.value;
        });
        seedDefaultSiteContent().catch(() => {});
      } else {
        docs.forEach((doc) => {
          contentMap[doc.key] = doc.value;
        });
      }

      memoryContentCache = contentMap;

      return res.status(200).json({
        success: true,
        version: Date.now(),
        content: contentMap
      });
    }

    const fallbackMap: Record<string, any> = {};
    Object.entries(DEFAULT_SITE_CONTENT).forEach(([k, v]) => {
      fallbackMap[k] = memoryContentCache[k] || v.value;
    });

    return res.status(200).json({
      success: true,
      mode: 'fallback',
      content: fallbackMap
    });
  } catch (error: any) {
    logger.error('Failed to get public site content', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to retrieve site content' });
  }
};

/**
 * Public Endpoint: GET /api/site-content/:page
 */
export const getPublicSiteContentByPage = async (req: Request, res: Response) => {
  try {
    const { page } = req.params;
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const docs = await SiteContent.find({
        $or: [{ page }, { page: 'global' }]
      }).lean();

      const contentMap: Record<string, any> = {};
      docs.forEach((doc) => {
        contentMap[doc.key] = doc.value;
      });

      return res.status(200).json({ success: true, page, content: contentMap });
    }

    const fallbackMap: Record<string, any> = {};
    Object.entries(DEFAULT_SITE_CONTENT)
      .filter(([_, v]) => v.page === page || v.page === 'global')
      .forEach(([k, v]) => {
        fallbackMap[k] = memoryContentCache[k] || v.value;
      });

    return res.status(200).json({ success: true, page, content: fallbackMap });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve page content' });
  }
};

/**
 * Admin Endpoint: PUT /api/admin/site-content
 * Handles both single-item and batched updates, captures diff & snapshot,
 * and maintains version history.
 */
export const updateSiteContent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    let updates: { key: string; value: string; page?: string; section?: string; type?: string; label?: string }[] = [];

    if (body.items && typeof body.items === 'object') {
      updates = Array.isArray(body.items)
        ? body.items
        : Object.entries(body.items).map(([k, v]) => ({ key: k, value: String(v) }));
    } else if (body.key && body.value !== undefined) {
      updates = [
        {
          key: String(body.key).trim(),
          value: String(body.value).trim(),
          page: body.page,
          section: body.section,
          type: body.type,
          label: body.label
        }
      ];
    } else {
      return res.status(400).json({ error: 'Valid key/value or items payload is required' });
    }

    const isDbConnected = getDatabaseStatus() === 'connected';
    const adminUser = req.user?.email || 'admin';
    const changes: { key: string; oldValue?: string; newValue: string }[] = [];

    if (isDbConnected) {
      // 1. Fetch current values for diffing
      const keysToUpdate = updates.map((u) => u.key.trim());
      const existingDocs = await SiteContent.find({ key: { $in: keysToUpdate } }).lean();
      const existingMap = new Map(existingDocs.map((d) => [d.key, d.value]));

      // 2. Perform upserts
      const bulkOps = updates.map((item) => {
        const k = item.key.trim();
        const v = String(item.value).trim();
        const oldVal = existingMap.get(k);
        if (oldVal !== v) {
          changes.push({ key: k, oldValue: oldVal, newValue: v });
        }
        return {
          updateOne: {
            filter: { key: k },
            update: {
              $set: {
                value: v,
                updatedBy: adminUser,
                ...(item.page && { page: item.page }),
                ...(item.section && { section: item.section }),
                ...(item.type && { type: item.type }),
                ...(item.label && { label: item.label })
              }
            },
            upsert: true
          }
        };
      });

      await SiteContent.bulkWrite(bulkOps as any);

      // 3. Build snapshot of all content
      const allDocs = await SiteContent.find().lean();
      const currentSnapshot: Record<string, string> = {};
      allDocs.forEach((d) => {
        currentSnapshot[d.key] = d.value;
      });
      memoryContentCache = currentSnapshot;

      // 4. Record version history if any real changes occurred
      let savedHistory = null;
      if (changes.length > 0) {
        const versionId = `rev-${Date.now()}`;
        savedHistory = await SiteContentHistory.create({
          versionId,
          timestamp: new Date(),
          updatedBy: adminUser,
          changes,
          snapshot: currentSnapshot
        });

        // Prune older revisions beyond 20
        const totalRevisions = await SiteContentHistory.countDocuments();
        if (totalRevisions > 20) {
          const oldRevisions = await SiteContentHistory.find().sort({ timestamp: -1 }).skip(20).select('_id');
          const idsToDelete = oldRevisions.map((r) => r._id);
          await SiteContentHistory.deleteMany({ _id: { $in: idsToDelete } });
        }
      }

      logger.info(`Updated ${updates.length} site content items by ${adminUser}`);
      return res.status(200).json({
        success: true,
        message: 'Content updated successfully',
        updatedCount: updates.length,
        versionId: savedHistory?.versionId || null,
        changesCount: changes.length
      });
    }

    // Memory Fallback
    updates.forEach((u) => {
      const k = u.key.trim();
      const v = String(u.value).trim();
      const oldVal = memoryContentCache[k];
      if (oldVal !== v) {
        changes.push({ key: k, oldValue: oldVal, newValue: v });
      }
      memoryContentCache[k] = v;
    });

    const memoryRev = {
      versionId: `mem-${Date.now()}`,
      timestamp: new Date(),
      updatedBy: adminUser,
      changes,
      snapshot: { ...memoryContentCache }
    };
    memoryHistory.unshift(memoryRev);
    if (memoryHistory.length > 20) memoryHistory.pop();

    return res.status(200).json({
      success: true,
      mode: 'fallback',
      message: 'Content updated in memory session',
      updatedCount: updates.length,
      versionId: memoryRev.versionId,
      changesCount: changes.length
    });
  } catch (error: any) {
    logger.error('Update site content failed', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to update site content' });
  }
};

/**
 * Admin Endpoint: GET /api/admin/site-content/history
 * Returns the timeline of the last 20 saved content revisions
 */
export const getSiteContentHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const historyDocs = await SiteContentHistory.find()
        .sort({ timestamp: -1 })
        .limit(20)
        .select('versionId timestamp updatedBy changes')
        .lean();

      return res.status(200).json({
        success: true,
        history: historyDocs.map((h) => ({
          versionId: h.versionId,
          timestamp: h.timestamp,
          updatedBy: h.updatedBy,
          changesCount: h.changes?.length || 0,
          changes: h.changes || []
        }))
      });
    }

    return res.status(200).json({
      success: true,
      mode: 'fallback',
      history: memoryHistory.map((h) => ({
        versionId: h.versionId,
        timestamp: h.timestamp,
        updatedBy: h.updatedBy,
        changesCount: h.changes.length,
        changes: h.changes
      }))
    });
  } catch (error: any) {
    logger.error('Get content history failed', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to retrieve version history' });
  }
};

/**
 * Admin Endpoint: POST /api/admin/site-content/rollback/:versionId
 * Atomically restores the content snapshot from a previous revision
 */
export const rollbackSiteContent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { versionId } = req.params;
    const isDbConnected = getDatabaseStatus() === 'connected';
    const adminUser = req.user?.email || 'admin';

    if (isDbConnected) {
      const targetVersion = await SiteContentHistory.findOne({ versionId }).lean();
      if (!targetVersion || !targetVersion.snapshot) {
        return res.status(404).json({ error: 'Version revision not found' });
      }

      const snapshot = targetVersion.snapshot as Record<string, string>;
      const bulkOps = Object.entries(snapshot).map(([key, value]) => ({
        updateOne: {
          filter: { key },
          update: {
            $set: {
              value: String(value),
              updatedBy: `${adminUser} (Rollback to ${versionId})`
            }
          },
          upsert: true
        }
      }));

      await SiteContent.bulkWrite(bulkOps as any);

      // Create a rollback history event
      await SiteContentHistory.create({
        versionId: `rollback-${Date.now()}`,
        timestamp: new Date(),
        updatedBy: adminUser,
        changes: [{ key: 'all', oldValue: 'current', newValue: `Restored snapshot from ${versionId}` }],
        snapshot
      });

      memoryContentCache = snapshot;
      logger.info(`Site content rolled back to ${versionId} by ${adminUser}`);

      return res.status(200).json({
        success: true,
        message: `Content successfully restored to version ${versionId}`,
        content: snapshot
      });
    }

    // Memory Fallback
    const target = memoryHistory.find((h) => h.versionId === versionId);
    if (!target) return res.status(404).json({ error: 'Version not found' });

    memoryContentCache = { ...target.snapshot };
    memoryHistory.unshift({
      versionId: `mem-rollback-${Date.now()}`,
      timestamp: new Date(),
      updatedBy: adminUser,
      changes: [{ key: 'all', oldValue: 'current', newValue: `Restored from ${versionId}` }],
      snapshot: { ...memoryContentCache }
    });

    return res.status(200).json({
      success: true,
      mode: 'fallback',
      message: `Restored to ${versionId}`,
      content: memoryContentCache
    });
  } catch (error: any) {
    logger.error('Rollback failed', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to rollback version' });
  }
};
