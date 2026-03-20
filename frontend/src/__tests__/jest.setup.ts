/**
 * Jest setup file for the frontend test suite.
 * Imported via setupFilesAfterEnv in jest.config.ts.
 *
 * Extends Jest's expect with @testing-library/jest-dom matchers so we can
 * write assertions like:
 *   expect(element).toBeInTheDocument()
 *   expect(input).toHaveValue('hello')
 */
import '@testing-library/jest-dom';
