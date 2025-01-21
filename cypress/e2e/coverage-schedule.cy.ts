import { ApiTestUtils } from '../support/utils/api';
import { RealtimeTestUtils } from '../support/utils/realtime';
import { DatabaseTestUtils } from '../support/utils/database';

interface CoverageSchedule {
  id: string;
  team_id: string;
  start_date: string;
  end_date: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface CoverageShift {
  id: string;
  schedule_id: string;
  worker_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

describe('Coverage Schedule API', () => {
  let adminUser: any;
  let workerUser: any;
  let customerUser: any;
  let testTeam: any;

  beforeEach(() => {
    // Clear test data
    cy.task('clearTestData');

    // Create test users and team
    cy.wrap(null).then(async () => {
      // Create admin user
      const adminResult = await DatabaseTestUtils.createTestUser('Administrator');
      adminUser = adminResult;

      // Create worker user
      const workerResult = await DatabaseTestUtils.createTestUser('Worker');
      workerUser = workerResult;

      // Create customer user
      const customerResult = await DatabaseTestUtils.createTestUser('Customer');
      customerUser = customerResult;

      // Create test team
      testTeam = await DatabaseTestUtils.createTestTeam('Test Coverage Team');
    });
  });

  describe('Schedule Creation', () => {
    it('should allow administrators to create coverage schedules', () => {
      const scheduleData = {
        team_id: testTeam.id,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        timezone: 'UTC'
      };

      ApiTestUtils.makeAuthRequest<CoverageSchedule>(
        'POST',
        '/coverage-schedules',
        scheduleData,
        adminUser.session.access_token
      ).then((response) => {
        ApiTestUtils.validateResponseFormat(response);
        expect(response.body.team_id).to.equal(testTeam.id);
        expect(response.body.timezone).to.equal('UTC');

        // Test realtime update
        return RealtimeTestUtils.testRealtimeCrud('coverage_schedules', {
          team_id: testTeam.id,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: adminUser.user.id
        });
      }).then((changes) => {
        expect(changes).to.have.length(3); // INSERT, UPDATE, DELETE events
      });
    });

    it('should not allow customers to create coverage schedules', () => {
      const scheduleData = {
        team_id: testTeam.id,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      ApiTestUtils.makeAuthRequest(
        'POST',
        '/coverage-schedules',
        scheduleData,
        customerUser.session.access_token
      ).then((response) => {
        ApiTestUtils.validateErrorResponse(response, 403);
      });
    });

    it('should validate date ranges when creating schedules', () => {
      const invalidScheduleData = {
        team_id: testTeam.id,
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      };

      ApiTestUtils.makeAuthRequest(
        'POST',
        '/coverage-schedules',
        invalidScheduleData,
        adminUser.session.access_token
      ).then((response) => {
        ApiTestUtils.validateErrorResponse(response, 400);
      });
    });
  });

  describe('Schedule Management', () => {
    let testSchedule: CoverageSchedule;

    beforeEach(() => {
      cy.wrap(null).then(async () => {
        testSchedule = await DatabaseTestUtils.createTestSchedule({
          teamId: testTeam.id,
          createdBy: adminUser.user.id
        });
      });
    });

    it('should allow administrators to update schedules', () => {
      const updateData = {
        timezone: 'America/New_York'
      };

      ApiTestUtils.makeAuthRequest<CoverageSchedule>(
        'PATCH',
        `/coverage-schedules/${testSchedule.id}`,
        updateData,
        adminUser.session.access_token
      ).then((response) => {
        ApiTestUtils.validateResponseFormat(response);
        expect(response.body.timezone).to.equal('America/New_York');
      });
    });

    it('should allow workers to view schedules', () => {
      ApiTestUtils.makeAuthRequest<CoverageSchedule>(
        'GET',
        `/coverage-schedules/${testSchedule.id}`,
        null,
        workerUser.session.access_token
      ).then((response) => {
        ApiTestUtils.validateResponseFormat(response);
        expect(response.body.id).to.equal(testSchedule.id);
      });
    });

    it('should not allow customers to view schedules', () => {
      ApiTestUtils.makeAuthRequest(
        'GET',
        `/coverage-schedules/${testSchedule.id}`,
        null,
        customerUser.session.access_token
      ).then((response) => {
        ApiTestUtils.validateErrorResponse(response, 403);
      });
    });
  });

  describe('Shift Management', () => {
    let testSchedule: CoverageSchedule;

    beforeEach(() => {
      cy.wrap(null).then(async () => {
        testSchedule = await DatabaseTestUtils.createTestSchedule({
          teamId: testTeam.id,
          createdBy: adminUser.user.id
        });
      });
    });

    it('should allow creating shifts for workers', () => {
      const shiftData = {
        schedule_id: testSchedule.id,
        worker_id: workerUser.user.id,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      };

      ApiTestUtils.makeAuthRequest<CoverageShift>(
        'POST',
        '/coverage-shifts',
        shiftData,
        adminUser.session.access_token
      ).then((response) => {
        ApiTestUtils.validateResponseFormat(response);
        expect(response.body.worker_id).to.equal(workerUser.user.id);
      });
    });

    it('should prevent overlapping shifts for the same worker', () => {
      const baseTime = new Date();
      const shift1 = {
        schedule_id: testSchedule.id,
        worker_id: workerUser.user.id,
        start_time: baseTime.toISOString(),
        end_time: new Date(baseTime.getTime() + 4 * 60 * 60 * 1000).toISOString()
      };

      const shift2 = {
        schedule_id: testSchedule.id,
        worker_id: workerUser.user.id,
        start_time: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(baseTime.getTime() + 6 * 60 * 60 * 1000).toISOString()
      };

      // Create first shift
      ApiTestUtils.makeAuthRequest<CoverageShift>(
        'POST',
        '/coverage-shifts',
        shift1,
        adminUser.session.access_token
      ).then((response1) => {
        ApiTestUtils.validateResponseFormat(response1);

        // Try to create overlapping shift
        ApiTestUtils.makeAuthRequest(
          'POST',
          '/coverage-shifts',
          shift2,
          adminUser.session.access_token
        ).then((response2) => {
          ApiTestUtils.validateErrorResponse(response2, 400);
        });
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should emit real-time events for schedule changes', () => {
      RealtimeTestUtils.testRealtimeCrud('coverage_schedules', {
        team_id: testTeam.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: adminUser.user.id
      }).then((changes) => {
        expect(changes).to.have.length(3); // INSERT, UPDATE, DELETE events
      });
    });

    it('should have acceptable sync delay', () => {
      RealtimeTestUtils.testRealtimeDelay('coverage_schedules').then((delay) => {
        expect(delay).to.be.lessThan(500); // Less than 500ms delay
      });
    });
  });
}); 