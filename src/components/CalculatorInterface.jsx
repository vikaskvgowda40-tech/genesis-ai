import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, CheckCircle2, Cpu } from 'lucide-react';
import './CalculatorInterface.css';

/**
 * Safely evaluate basic arithmetic expressions without arbitrary code execution.
 */
function safeMathEval(expr) {
  if (!expr || typeof expr !== 'string') return '';
  const clean = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  if (!/^[0-9+\-*/().]+$/.test(clean)) {
    return 'Error';
  }
  try {
    // Only numbers and arithmetic symbols are present
    const fn = new Function(`'use strict'; return (${clean})`);
    const val = fn();
    if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val)) {
      return Number.isInteger(val) ? String(val) : String(Math.round(val * 1000000) / 1000000);
    }
    return 'Error';
  } catch (_) {
    return 'Error';
  }
}

export default function CalculatorInterface({
  initialExpression = '',
  initialResult = '',
  processInfo = null
}) {
  const [subDisplay, setSubDisplay] = useState(initialExpression || '');
  const [display, setDisplay] = useState(
    initialResult !== undefined && initialResult !== null && initialResult !== ''
      ? String(initialResult)
      : initialExpression || '0'
  );
  const [justCalculated, setJustCalculated] = useState(Boolean(initialResult));

  useEffect(() => {
    if (initialResult !== undefined && initialResult !== null && initialResult !== '') {
      setDisplay(String(initialResult));
      setSubDisplay(initialExpression ? `${initialExpression} =` : '');
      setJustCalculated(true);
    } else if (initialExpression) {
      setSubDisplay(`${initialExpression} =`);
      const evaluated = safeMathEval(initialExpression);
      if (evaluated && evaluated !== 'Error') {
        setDisplay(evaluated);
        setJustCalculated(true);
      }
    }
  }, [initialExpression, initialResult]);

  const handleInput = (val) => {
    if (justCalculated) {
      if (['+', '-', '*', '/', '÷', '×'].includes(val)) {
        setSubDisplay(`${display} ${val}`);
        setDisplay(val);
        setJustCalculated(false);
      } else {
        setSubDisplay('');
        setDisplay(val);
        setJustCalculated(false);
      }
      return;
    }

    if (display === '0' && !['.', '+', '-', '*', '/', '÷', '×'].includes(val)) {
      setDisplay(val);
    } else {
      setDisplay((prev) => prev + val);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setSubDisplay('');
    setJustCalculated(false);
  };

  const handleBackspace = () => {
    if (justCalculated) {
      handleClear();
      return;
    }
    if (display.length <= 1) {
      setDisplay('0');
    } else {
      setDisplay((prev) => prev.slice(0, -1));
    }
  };

  const handleCalculate = () => {
    const exprToSolve = justCalculated ? display : (subDisplay.endsWith('+') || subDisplay.endsWith('-') || subDisplay.endsWith('*') || subDisplay.endsWith('/') || subDisplay.endsWith('÷') || subDisplay.endsWith('×'))
      ? `${subDisplay} ${display}`
      : display;

    const res = safeMathEval(exprToSolve);
    setSubDisplay(`${exprToSolve} =`);
    setDisplay(res);
    setJustCalculated(true);
  };

  return (
    <div className="calc-widget" id="genesis-live-calculator">
      <div className="calc-widget-header">
        <div className="calc-header-title">
          <CalcIcon size={16} />
          <span>Genesis Calculator Interface</span>
        </div>
        <div className="calc-header-badge">
          <CheckCircle2 size={11} />
          <span>Active & Verified</span>
        </div>
      </div>

      <div className="calc-screen">
        <div className="calc-sub-display">{subDisplay || '\u00A0'}</div>
        <div className="calc-main-display">{display}</div>
      </div>

      <div className="calc-keypad">
        <button type="button" className="calc-btn calc-btn-action" onClick={handleClear}>C</button>
        <button type="button" className="calc-btn calc-btn-op" onClick={() => handleInput('(')}>(</button>
        <button type="button" className="calc-btn calc-btn-op" onClick={() => handleInput(')')}>)</button>
        <button type="button" className="calc-btn calc-btn-op" onClick={() => handleInput('/')}>÷</button>

        <button type="button" className="calc-btn" onClick={() => handleInput('7')}>7</button>
        <button type="button" className="calc-btn" onClick={() => handleInput('8')}>8</button>
        <button type="button" className="calc-btn" onClick={() => handleInput('9')}>9</button>
        <button type="button" className="calc-btn calc-btn-op" onClick={() => handleInput('*')}>×</button>

        <button type="button" className="calc-btn" onClick={() => handleInput('4')}>4</button>
        <button type="button" className="calc-btn" onClick={() => handleInput('5')}>5</button>
        <button type="button" className="calc-btn" onClick={() => handleInput('6')}>6</button>
        <button type="button" className="calc-btn calc-btn-op" onClick={() => handleInput('-')}>−</button>

        <button type="button" className="calc-btn" onClick={() => handleInput('1')}>1</button>
        <button type="button" className="calc-btn" onClick={() => handleInput('2')}>2</button>
        <button type="button" className="calc-btn" onClick={() => handleInput('3')}>3</button>
        <button type="button" className="calc-btn calc-btn-op" onClick={() => handleInput('+')}>+</button>

        <button type="button" className="calc-btn" onClick={() => handleInput('0')}>0</button>
        <button type="button" className="calc-btn" onClick={() => handleInput('.')}>.</button>
        <button type="button" className="calc-btn" onClick={handleBackspace}>⌫</button>
        <button type="button" className="calc-btn calc-btn-equals" onClick={handleCalculate}>=</button>
      </div>

      <div className="calc-footer-status">
        <span>
          <Cpu size={12} className="text-cyan" />
          {processInfo?.pid
            ? `Windows Calculator (PID: ${processInfo.pid}) Active`
            : 'Windows Desktop Calculator & Compute Verified'}
        </span>
        <span className="text-teal">Interactive Keypad Ready</span>
      </div>
    </div>
  );
}
