const twilioMaskingService = require('../services/twilioMaskingService');
const twilio = require('twilio');

jest.mock('twilio');

describe('Twilio Masking Service', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = {
            ...originalEnv,
            TWILIO_ACCOUNT_SID: 'mock-sid',
            TWILIO_AUTH_TOKEN: 'mock-token',
            TWILIO_PROXY_SERVICE_SID: 'mock-proxy-sid'
        };
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    test('getProxyNumber should throw error if credentials missing', async () => {
        delete process.env.TWILIO_ACCOUNT_SID;
        await expect(twilioMaskingService.getProxyNumber('d1', 'c1', 'r1')).rejects.toThrow('Twilio credentials missing');
    });

    test('getProxyNumber should return twilio proxy identifier on existing session', async () => {
        const mockParticipant = { proxyIdentifier: '+1234567890' };
        const createMock = jest.fn().mockResolvedValue(mockParticipant);
        const fetchMock = jest.fn().mockResolvedValue({ sid: 'session-sid' });

        twilio.mockReturnValue({
            proxy: {
                v1: {
                    services: () => ({
                        sessions: (sid) => ({
                            fetch: fetchMock,
                            participants: {
                                create: createMock
                            }
                        })
                    })
                }
            }
        });

        const result = await twilioMaskingService.getProxyNumber('d1', 'c1', 'r1');
        expect(result).toBe('+1234567890');
        expect(fetchMock).toHaveBeenCalled();
        expect(createMock).toHaveBeenCalledTimes(2);
    });

    test('getProxyNumber should create session if not exists and return proxy identifier', async () => {
        const mockParticipant = { proxyIdentifier: '+1234567890' };
        const createParticipantMock = jest.fn().mockResolvedValue(mockParticipant);
        const createSessionMock = jest.fn().mockResolvedValue({ sid: 'new-session-sid' });
        
        const error404 = new Error('Not found');
        error404.status = 404;
        const fetchMock = jest.fn().mockRejectedValue(error404);

        // We need to return an object with both a function and a property
        const sessionsMock = (sid) => {
            if (sid === 'd1') {
                return { fetch: fetchMock };
            }
            return {
                participants: { create: createParticipantMock }
            };
        };
        sessionsMock.create = createSessionMock;

        twilio.mockReturnValue({
            proxy: {
                v1: {
                    services: () => ({
                        sessions: sessionsMock
                    })
                }
            }
        });

        const result = await twilioMaskingService.getProxyNumber('d1', 'c1', 'r1');
        expect(result).toBe('+1234567890');
        expect(fetchMock).toHaveBeenCalled();
        expect(createSessionMock).toHaveBeenCalled();
        expect(createParticipantMock).toHaveBeenCalledTimes(2);
    });
});
